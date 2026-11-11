import { ArrowDownSquare, ArrowUpSquare, LockKeyhole, Search } from 'lucide-react'
import { useContext, useState } from "react";
import type {FunctionComponent} from "react";
import { usePaginatedQuery } from 'convex/react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { useDebounce } from 'use-debounce'
import { useCreateIncomingMutation } from './queries';
import { api } from "convex/_generated/api";
import ComingMaterialForm from './forms/coming';
import type {IncomingFormData} from './forms/coming';
import type { Fabrics, Materials, StoreMovements } from "convex/schema";
import { type HeaderObject } from "simple-table-core";
import { DialogContext } from '@/contexts/dialog'
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppTable from '@/components/ui/app-table';

// getMovementsWithMaterials resolves a movement's variant back to its parent
// fabric/material doc, plus the variant's own color/sku(/size) — not the raw
// fabricVariants/materialVariants doc, which has neither `name` nor `units`.
type ResolvedMaterial = (Fabrics | Materials) & { color?: string; size?: string; sku?: string };

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
      const row = props.row as StoreMovements & { material: ResolvedMaterial };
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
      const row = props.row as StoreMovements & { material: ResolvedMaterial };
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
      const row = props.row as StoreMovements & { material: ResolvedMaterial };
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
      const row = props.row as StoreMovements & { material: ResolvedMaterial };
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
  { accessor: "description", label: "Коментар", width: 150, isSortable: true, type: "string" },
  { accessor: "sku", label: "SKU", width: 100, isSortable: true, type: "string",
    cellRenderer: (props) => {
      const row = props.row as StoreMovements & { material: ResolvedMaterial };
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
];

export type MaterialsOption = ReturnType<typeof generateOptions>;
 
const InventoryMovement: FunctionComponent = () => {
  const { openDialog, closeDialog, setIsLoading } = useContext(DialogContext);
  const { results: data, status, loadMore } = usePaginatedQuery(
    api.queries.movements.getMovementsWithMaterials,
    {},
    { initialNumItems: 100 },
  );
  const [input, setInput] = useState('');
  const [search] = useDebounce(input.trim(), 300);
  const { data: searchResults, isLoading: isSearchLoading } = useQuery({
    ...convexQuery(api.queries.movements.searchMovementsWithMaterials, { search }),
    enabled: !!search,
    placeholderData: keepPreviousData,
  });
  const { mutate: incomingMutation} = useCreateIncomingMutation();

  const handlePageChange = (page: number) => {
    const needed = (page + 1) * 50
    if (!search && needed > data.length && status === 'CanLoadMore') {
      loadMore(100)
    }
  }

  const handleSubmit = (data: IncomingFormData | any) => {
    setIsLoading(true)
    incomingMutation(data, {
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
        <div className="relative w-96">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Пошук: матеріал, колір, SKU, менеджер, опис, № замовлення"
            className="h-9.5 pl-8 text-sm"
          />
        </div>
      </div>
      <AppTable
        key={search}
        shouldPaginate
        rowsPerPage={50}
        rows={search ? searchResults ?? [] : data || []}
        isLoading={search ? isSearchLoading : status === 'LoadingFirstPage'}
        tableEmptyStateRenderer={<div className="py-8 text-center text-sm text-muted-foreground">Нічого не знайдено</div>}
        defaultHeaders={headers}
        rowGrouping={['group', 'data']}
        onPageChange={handlePageChange}
        getRowId={({ row }) => row._id as string}
      />
    </div>
  );
}
 
export default InventoryMovement;