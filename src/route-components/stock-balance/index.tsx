import type { FunctionComponent } from "react";
import { usePaginatedQuery } from 'convex/react'
import { api } from "convex/_generated/api";
import { type HeaderObject } from "simple-table-core";
import AppTable from '@/components/ui/app-table';

const materialTypeLabels: Record<string, string> = {
  fabricVariants: 'Тканина',
  materialVariants: 'Матеріал',
};

const renderHeader = ({ header }: { header: HeaderObject }) => (
  <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/50 px-2">
    {header.label}
  </span>
)

const QuantityBadge = ({ value, units, className }: { value: number; units?: string; className: string }) => (
  <div className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-sm font-medium ${className}`}>
    <span>{value.toFixed(2)}</span>
    {units && <span className="text-xs opacity-70">{units}</span>}
  </div>
)

const headers: Array<HeaderObject> = [
  {
    accessor: "name",
    label: "Матеріал",
    width: 80,
    isSortable: true,
    type: "string",
    minWidth: 200,
    headerRenderer: renderHeader,
    // The real value lives under row.material (see getStockBalancesWithMaterials) —
    // without this, quick-filter search has nothing to match against, since it
    // reads off the plain accessor value, not the cellRenderer's JSX.
    valueFormatter: ({ row }) => (row as any).material?.name ?? '',
    cellRenderer: (props) => {
      const row = props.row as any;
      return <span className='text-sm'>{row.material?.name || '—'}</span>
    }
  },
  {
    accessor: "materialType",
    label: "Тип",
    width: 120,
    isSortable: true,
    type: "string",
    headerRenderer: renderHeader,
    cellRenderer: (props) => {
      const row = props.row as any;
      return <span className='text-sm'>{materialTypeLabels[row.materialType] ?? row.materialType}</span>
    }
  },
  {
    accessor: "color",
    label: "Колір",
    width: 120,
    isSortable: true,
    type: "string",
    headerRenderer: renderHeader,
    valueFormatter: ({ row }) => (row as any).material?.color ?? '',
    cellRenderer: (props) => {
      const row = props.row as any;
      return <span className='text-sm'>{row.material?.color || '—'}</span>
    }
  },
  {
    accessor: "size",
    label: "Розмір",
    width: 100,
    isSortable: true,
    type: "string",
    headerRenderer: renderHeader,
    valueFormatter: ({ row }) => (row as any).material?.size ?? '',
    cellRenderer: (props) => {
      const row = props.row as any;
      return <span className='text-sm'>{row.material?.size || '—'}</span>
    }
  },
  {
    accessor: "sku",
    label: "SKU",
    width: 100,
    isSortable: true,
    type: "string",
    headerRenderer: renderHeader,
    valueFormatter: ({ row }) => (row as any).material?.sku ?? '',
    cellRenderer: (props) => {
      const row = props.row as any;
      return <span className='text-xs text-[#868686]'>{row.material?.sku || '—'}</span>
    }
  },
  {
    accessor: "inStock",
    label: "В наявності",
    width: 130,
    isSortable: true,
    type: "number",
    headerRenderer: renderHeader,
    cellRenderer: (props) => {
      const row = props.row as any;
      return <QuantityBadge value={Number(row.inStock)} units={row.material?.units} className="bg-blue-100 text-blue-700" />
    }
  },
  {
    accessor: "reserved",
    label: "Заброньовано",
    width: 130,
    isSortable: true,
    type: "number",
    headerRenderer: renderHeader,
    cellRenderer: (props) => {
      const row = props.row as any;
      return <QuantityBadge value={Number(row.reserved)} units={row.material?.units} className="bg-amber-100 text-amber-700" />
    }
  },
  {
    accessor: "available",
    label: "Доступно",
    width: 130,
    isSortable: true,
    type: "number",
    headerRenderer: renderHeader,
    cellRenderer: (props) => {
      const row = props.row as any;
      const available = Number(row.inStock) - Number(row.reserved);
      const className = available < 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700';
      return <QuantityBadge value={available} units={row.material?.units} className={className} />
    }
  },
  {
    accessor: "updateAt",
    label: "Оновлено",
    width: 180,
    isSortable: true,
    type: "date",
    headerRenderer: renderHeader,
    valueFormatter: ({ value }) => {
      if (!value) return '—';
      const date = new Date(value as number);
      return date.toLocaleDateString("uk-UA", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  },
];

const StockBalance: FunctionComponent = () => {
  const { results: data, status, loadMore } = usePaginatedQuery(
    api.queries.movements.getStockBalancesWithMaterials,
    {},
    { initialNumItems: 100 },
  );

  const handlePageChange = (page: number) => {
    const needed = (page + 1) * 50
    if (needed > data.length && status === 'CanLoadMore') {
      loadMore(100)
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <AppTable
        withSearch
        shouldPaginate
        rowsPerPage={50}
        rows={data || []}
        defaultHeaders={headers}
        onPageChange={handlePageChange}
        columnSearch={['name', 'color', 'size']}
        isLoading={status === 'LoadingFirstPage'}
        getRowId={({ row }: any) => row._id as string}
      />
    </div>
  );
}

export default StockBalance;
