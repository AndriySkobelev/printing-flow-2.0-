import { ArrowDownSquare, ArrowUpSquare, LockKeyhole } from 'lucide-react'
import { useContext } from "react";
import type {FunctionComponent} from "react";
import { useQuery } from '@tanstack/react-query'
import { useCreateIncomingMutation } from './queries';
import { convexQuery } from '@convex-dev/react-query'
import { api } from "convex/_generated/api";
import ComingMaterialForm from './forms/coming';
import type {IncomingFormData} from './forms/coming';
import type { Fabrics, Materials, StoreMovements } from "convex/schema";
import { type HeaderObject } from "simple-table-core";
import { DialogContext } from '@/contexts/dialog'
import { Button } from '@/components/ui/button';
import AppTable from '@/components/ui/app-table';
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
    minWidth: 200,
    cellRenderer: (props) => {
      const row = props.row as StoreMovements & { material: Materials | Fabrics};
      return (
        <div
          className='flex items-center gap-1 rounded-md w-fit px-1.5 py-0'
        >
          <span className='text-sm'>{row.material?.name || '—'}</span>
        </div>
      )
    }
  },
  {
    accessor: "color",
    label: "Колір",
    width: 150,
    isSortable: true,
    type: "string",
    cellRenderer: (props) => {
      const row = props.row as StoreMovements & { material: Materials | Fabrics};
      return (
        <div
          className='flex items-center gap-1 rounded-md w-fit py-0'
        >
          <span className='text-sm'>{row.material?.color || '—'}</span>
        </div>
      )
    }
  },
  {
    accessor: "orderId",
    label: "Номер замовлення",
    width: 120,
    isSortable: true,
    type: "number",
    cellRenderer: (props) => {
      const row = props.row as StoreMovements & { material: Materials | Fabrics};
      return (
        <div
          className='flex items-center gap-1 rounded-md w-fit px-1.5 py-0'
        >
          <span className='text-sm'>{row.orderId || '—'}</span>
        </div>
      )
    }
  },
  {
    accessor: "quantity",
    label: "Кількість",
    width: 150,
    isSortable: true,
    type: "number",
    cellRenderer: (props) => {
      const row = props.row as StoreMovements & { material: Materials | Fabrics};
      return (
        <div
          style={{ backgroundColor: typeIcons[row.type].bg}}
          className='flex items-center gap-1 rounded-md w-fit px-1.5 py-0'
        >
          {typeIcons[row.type].component}
          <span className='text-sm'>{row.type === 'incoming' ? `+${Number(row.quantity).toFixed(2)}` : `-${Number(row.quantity).toFixed(2)}`}</span>
          <span className='text-xs text-[#868686]'>{row?.material?.units || '?'}</span>
        </div>
      )
    }
  },
  { accessor: "manager", label: "Менеджер", width: 150, isSortable: true, type: "string" },
  { accessor: "sku", label: "SKU", width: 100, isSortable: true, type: "string",
    cellRenderer: (props) => {
      const row = props.row as StoreMovements & { material: Materials | Fabrics};
      return (
        <div
          className='flex items-center gap-1 rounded-md w-fit py-0'
        >
          <span className='text-xs text-[#868686]'>{row?.material?.sku || '?'}</span>
        </div>
      )
    }
  },
  {
    accessor: "_creationTime",
    label: "Дата створення",
    width: 200,
    isSortable: true,
    type: "date",
    valueFormatter: ({ value }) => {
      const date = new Date(value as string) || '-';
      return date.toLocaleDateString("uk-UA", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  },
  {
    accessor: "orderShippingDate",
    label: "Дата видачі",
    width: 200,
    isSortable: true,
    type: "date",
    valueFormatter: ({ value }) => {
      if (!value) return '-'; 
      const date = new Date(value as string) || '-';
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
  const { data } = useQuery(convexQuery(api.queries.movements.getMovementsWithMaterials));
  console.log("🚀 ~ InventoryMovement ~ data:", data)
  const incomingMutation = useCreateIncomingMutation();

  const handleSubmit = (data: IncomingFormData | any) => {
    const preparedData = {
      ...data,
      materialId: data.materialId.value,
    };
    setIsLoading(true)
    incomingMutation.mutate(preparedData, {
      onSuccess: () => {
        setIsLoading(false);
        closeDialog();
      },
      onError: () => {
        setIsLoading(false);
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

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className='flex gap-2'>
        <Button onClick={handleComingMaterial}>+ Прихід</Button>
        <Button onClick={handleConsumptionMaterial}>- Росхід</Button>
        {/* <Button onClick={handleUpdate}>Update Data</Button> */}
      </div>
      <AppTable
        rows={data || []}
        isLoading={!data}
        defaultHeaders={headers}
        rowGrouping={['group', 'data']}
        getRowId={({ row }) => row.id as string}
      />
    </div>
  );
}
 
export default InventoryMovement;