import * as R from 'ramda'
import { ArrowUpSquare, ArrowDownSquare, LockKeyhole } from 'lucide-react'
import { type FunctionComponent, useContext, useMemo, useState } from "react";
import { type CellClickProps, SimpleTable  } from "simple-table-core";
import { useQuery } from '@tanstack/react-query'
import { useCreateIncomingMutation, useMigrateMutation } from './queries';
import { convexQuery } from '@convex-dev/react-query'
import { api } from "convex/_generated/api";
import ComingMaterialForm, { type IncomingFormData } from './forms/coming';
import type { Fabrics, StoreMovements } from "convex/schema";
import type { HeaderObject, Theme } from "simple-table-core";
import { DialogContext } from '@/contexts/dialog'
import { Button } from '@/components/ui/button';
import "simple-table-core/styles.css";
import "simple-table-my-theme.css"

const typeIcons = {
  incoming: {
    bg: '#e0f5dd',
    component: <ArrowUpSquare size={16} color="#22c55e" />
  },
  outgoing: {
    bg: '#fee2e2',
    component: <ArrowDownSquare size={16} color="#ef4444" />
  },
  reserve: {
    bg: '#e1e7e9',
    component: <LockKeyhole size={16} color="#a3a9ab" />
  }
}

const groupingData = (data: Array<Fabrics>) => {
  const addGroup = data.map((item) => ({ ...item, headerName: item.color, data: []}))
  const grouped = R.groupBy((item: Fabrics) => item.fabricName, addGroup);
  const newData = R.keys(grouped).map((item) => {
    const group = grouped[item] || [];
    return {
      group,
      headerName: item,
      fabricName: item,
      groupCount: group.length,
    }
  });
  return newData
}

const generateOptions = <T,> (data: Array<T>, optionValue: keyof T) => {
  return data.map((item) => ({
    value: item[optionValue],
    label: item[optionValue],
  }));
};

const headers: Array<HeaderObject> = [
  {
    accessor: "name",
    label: "Матеріал",
    width: 80,
    isSortable: true,
    type: "string",
    minWidth: 250
  },
  {
    accessor: "color", label: "Колір", width: 220, isSortable: true, type: "string"
  },
  {
    accessor: "quantity",
    label: "Кількість",
    width: 150,
    isSortable: true,
    type: "number",
    cellRenderer: (props) => {
      const row = props.row as StoreMovements;
      return (
        <div
          style={{ backgroundColor: typeIcons[row.type].bg}}
          className='flex items-center gap-1 rounded-md w-fit px-1.5 py-0'
        >
          {typeIcons[row.type].component}
          <span className='text-sm'>{row.type === 'incoming' ? `+${row.quantity}` : `-${row.quantity}`}</span>
          <span className='text-xs text-[#868686]'>{row?.units || '?'}</span>
        </div>
      )
    }
  },
  { accessor: "sku", label: "SKU", width: 100, isSortable: true, type: "string" },
  {
    accessor: "_creationTime",
    label: "Дата створення",
    width: 200,
    isSortable: true,
    type: "date",
    valueFormatter: ({ value }) => {
      const date = new Date(value as string);
      return date.toLocaleDateString("uk-UA", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  },
];


export type MaterialsOption = ReturnType<typeof generateOptions>;
 
const InventoryMovement: FunctionComponent = () => {
  const { openDialog, closeDialog, setIsLoading } = useContext(DialogContext);
  const { data } = useQuery(convexQuery(api.materials.getMovements, {}));
  const incomingMutation = useCreateIncomingMutation();
  const someMutate = useMigrateMutation();

  const handleSubmit = (data: IncomingFormData | any) => {
    const preparedData = {
      ...data,
      tableName: 'fabrics',
      materialId: data.materialId.value,
    };
    setIsLoading(true)
    incomingMutation.mutate(preparedData,{
      onSuccess: () => {
        closeDialog()
        setIsLoading(false)
        console.log("🚀 ~ handleSubmit ~ Success")
      },
      onError: (error) => {
        setIsLoading(false)
        console.error("🚀 ~ handleSubmit ~ error:", error)
      }
    });

  }

  const handleComingMaterial = () => {
    openDialog({
      title: 'Прихід матеріалу',
      isLoading: incomingMutation.isPending,
      content:
        <ComingMaterialForm
          type='incoming'
          formId='incoming-material-form'
          actionSubmit={handleSubmit}/>,
      withForm: true,
      formId: 'incoming-material-form',
    });
  }

  const handleConsumptionMaterial = () => {
    openDialog({
      title: 'Росхід матеріал',
      content:
        <ComingMaterialForm
          type='outgoing'
          formId="outgoing-material-form"
          actionSubmit={handleSubmit}/>,
      withForm: true,
      formId: 'outgoing-material-form',
    });
  }

  const handleUpdate = () => {
    someMutate.mutate({});
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className='flex gap-2'>
        <Button onClick={handleComingMaterial}>+ Прихід</Button>
        <Button onClick={handleConsumptionMaterial}>- Росхід</Button>
        {/* <Button onClick={handleUpdate}>Update Data</Button> */}
      </div>
      <SimpleTable
        editColumns
        theme={'custom'}
        columnResizing
        height={600}
        selectableCells
        expandAll={false}
        rows={data || []}
        isLoading={!data}
        enableStickyParents
        // onCellClick={handleCellClick}
        rowGrouping={['group', 'data']}
        defaultHeaders={headers}
        customTheme={{
          rowHeight: 42,
          headerHeight: 40,
          nestedGridMaxHeight: 400,
          nestedGridBorderWidth: 1,
        }}
        getRowId={({ row }) => row.id as string}
      />
    </div>
  );
}
 
export default InventoryMovement;