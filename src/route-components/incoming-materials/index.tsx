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
    accessor: "fabricName",
    label: "Матеріал",
    width: 80,
    isSortable: true,
    type: "string",
    minWidth: 250
  },
  { accessor: "color", label: "Колір", width: 220, isSortable: true, type: "string" },
  {
    accessor: "quantity",
    label: "Кількість (кг)",
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

const SelectedRow = ({ row }:{ row?: undefined | Fabrics}) => {
  return (
    <div className='flex gap-2 border-1 border-[#d6d6d6] rounded-xl border-solid py-2 px-4 w-fit'>
      <div className='flex gap-1'>
        <span className='text-[#6e6e6e]'>Матеріал:</span>
        <span className='text-m font-[500]'>{row && row.fabricName ? row.fabricName : '-'}</span>
      </div>
      <div className='flex gap-1'>
        <span className='text-[#6e6e6e]'>Колір:</span>
        <span className='text-m font-[500]'>{row && row.color ? row.color : '-'}</span>
      </div>
      <div className='flex gap-1'>
        <span className='text-[#6e6e6e]'>SKU:</span>
        <span className='text-m font-[500]'>{row && row.sku ? row.sku : '-'}</span>
      </div>
    </div>
  )
}
 
const StoreMovements: FunctionComponent = () => {
  const { openDialog, closeDialog, setIsLoading } = useContext(DialogContext);
  const [rowData, setRowData] = useState<CellClickProps>()
  const { data } = useQuery(convexQuery(api.materials.getMovements, {}));
  const migrate = useMigrateMutation();
  const incomingMutation = useCreateIncomingMutation();

  const defaultValue = useMemo(() => {
    if (!rowData) return undefined;
    return {
      fabricName: rowData.row.fabricName as string,
      color: rowData.row.color as string,
      quantity: 1,
    }
  }, [rowData]);

  const handleSubmit = (data: IncomingFormData | any) => {
    console.log("🚀 ~ handleSubmit ~ data:", data)
    setIsLoading(true)
    incomingMutation.mutate({
      ...data,
      materialId: rowData?.row?._id,
      sku: rowData?.row?.sku as number,
    },{
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
      content: <ComingMaterialForm
        defaultValue={defaultValue}
        formId='coming-material-form'
        actionSubmit={(data) => handleSubmit({ ...data, type: 'incoming' })}/>,
      withForm: true,
      formId: 'coming-material-form',
    });
  }

  const handleConsumptionMaterial = () => {
    openDialog({
      title: 'Росхід матеріал',
      content: <ComingMaterialForm
        defaultValue={defaultValue}
        formId="consumption-material-form"
        actionSubmit={(data) => handleSubmit({ ...data, type: 'outgoing' })}/>,
      withForm: true,
      formId: 'consumption-material-form',
    });
  }

  const handleCellClick = (row: any) => {
    console.log("🚀 ~ handleCellClick ~ data:", row)
    setRowData(row);
  }
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className='flex gap-2'>
        <Button onClick={handleComingMaterial}>+ Прихід</Button>
        <Button onClick={handleConsumptionMaterial}>- Росхід</Button>
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
 
export default StoreMovements;