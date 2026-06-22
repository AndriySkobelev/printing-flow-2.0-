import { useMemo, useState, useContext } from 'react'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { type HeaderObject, type CellClickProps } from 'simple-table-core'
import { Route as orderDetailsRoute } from '@/routes/_authenticated/app/production-orders_.$orderId'
import { Route as productionOrdersRoute } from '@/routes/_authenticated/app/production-orders'
import { api } from 'convex/_generated/api'
import AppTable from '@/components/ui/app-table'
import { MyPopover } from '@/components/my-popover'
import { useNavigate } from '@tanstack/react-router'
import { Search, Plus, Trash2, RefreshCw, Loader2 } from 'lucide-react'
import { useCreateProductionOrder, useDeleteProductionOrder, useSyncKeyCrmOrders } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Divider from '@/components/ui/divider'
import { DialogContext } from '@/contexts/dialog'
import { ActionsMenu } from '@/components/actions-menu'
import CreateOrderForm from './forms/create-order'
import { cn } from '@/lib/utils'

// ─── Products cell ────────────────────────────────────────────────────────────

const ProductsCell = ({ row }: { row: Record<string, unknown> }) => {
  const items = (row.data as { name: string; quantity: number }[] | undefined) ?? []

  const byName = new Map<string, number>()
  for (const item of items) {
    byName.set(item.name, (byName.get(item.name) ?? 0) + item.quantity)
  }
  const unique = [...byName.entries()]

  if (unique.length === 0) return null
  const [[firstName]] = unique
  const extra = unique.length - 1

  if (extra === 0) return <span className="text-xs truncate">{firstName}</span>

  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <span className="text-xs truncate">{firstName}</span>
      <MyPopover
        align="start"
        trigger={
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium cursor-pointer shrink-0"
            onClick={e => e.stopPropagation()}
          >
            +{extra}
          </span>
        }
        content={
          <div className="flex flex-col gap-0.5 min-w-36">
            {unique.map(([name, qty]) => (
              <div key={name} className="flex items-center justify-between gap-4 text-xs py-0.5">
                <span>{name}</span>
                <span className="text-muted-foreground shrink-0">{qty} шт</span>
              </div>
            ))}
          </div>
        }
      />
    </div>
  )
}

// ─── Status badge ─────────────────────────────────────────────────────────────

type StatusKey = 'new' | 'in_progress' | 'dispatched' | 'done' | 'cancelled'

const STATUS_CONFIG: Record<StatusKey, { label: string; className: string }> = {
  new:         { label: 'Нове',         className: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'В роботі',     className: 'bg-amber-100 text-amber-700' },
  dispatched:  { label: 'Відправлено',  className: 'bg-purple-100 text-purple-700' },
  done:        { label: 'Виконано',     className: 'bg-green-100 text-green-700' },
  cancelled:   { label: 'Скасовано',    className: 'bg-gray-100 text-gray-500' },
}

const StatusBadge = ({ status }: { status: string }) => {
  const cfg = STATUS_CONFIG[status as StatusKey]
  if (!cfg) return null
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}

// ─── Actions cell ─────────────────────────────────────────────────────────────

const ActionsCell = ({ orderId }: { orderId: string }) => {
  const { mutate: deleteOrder, isPending } = useDeleteProductionOrder()

  return (
    <div onClick={e => e.stopPropagation()}>
      <ActionsMenu
        items={[{
          label: 'Видалити',
          icon: <Trash2 size={12} />,
          destructive: true,
          disabled: isPending,
          onClick: () => deleteOrder({ productionOrderId: orderId as any }),
        }]}
      />
    </div>
  )
}

// ─── Headers ──────────────────────────────────────────────────────────────────
const renderHeader = ({ header }: { header: HeaderObject }) => (
  <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/50 px-2">
    {header.label}
  </span>
)

const formatDate = (ts: number) =>
  new Date(ts).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: '2-digit' })

const headers: HeaderObject[] = [
  {
    accessor:    'group',
    label:       '№ / Менеджер',
    width:       160,
    minWidth:    100,
    type:        'string',
    expandable:  true,
    showWhen:    'always',
    collapsible: true,
    headerRenderer: renderHeader,
    cellRenderer: ({ row }) => (
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-xs font-medium truncate">{row.group as string}</span>
        {row.keycrmManager && (
          <span className="text-[11px] text-muted-foreground truncate">{row.keycrmManager as string}</span>
        )}
      </div>
    ),
  },
  {
    accessor:     'products',
    label:        'Товари',
    width:        200,
    minWidth:     80,
    type:         'string',
    showWhen:     'parentCollapsed',
    headerRenderer: renderHeader,
    cellRenderer: ({ row }) => <ProductsCell row={row} />,
  },
  {
    accessor:   'totalQty',
    label:      'Всього шт',
    width:      90,
    minWidth:   70,
    type:       'number',
    isSortable: true,
    headerRenderer: renderHeader,
    showWhen:   'parentCollapsed',
  },
  {
    accessor:   'status',
    label:      'Статус',
    width:      110,
    minWidth:   80,
    type:       'string',
    isSortable: true,
    headerRenderer: renderHeader,
    showWhen:   'parentCollapsed',
    cellRenderer: ({ row }) => <StatusBadge status={row.status as string} />,
  },
  {
    accessor:   'executionTime',
    label:      'Час виконання',
    width:      120,
    minWidth:   70,
    type:       'number',
    isSortable: true,
    headerRenderer: renderHeader,
    showWhen:   'parentCollapsed',
  },
  {
    accessor:       'plannedShipDate',
    label:          'Відвантаження',
    width:          120,
    minWidth:       90,
    type:           'string',
    isSortable:     true,
    headerRenderer: renderHeader,
    valueFormatter: ({ value }) => value ? formatDate(value as number) : '—',
    showWhen:       'parentCollapsed',
  },
  {
    accessor:    'actions',
    label:       '',
    width:       40,
    minWidth:    40,
    type:        'string',
    showWhen:    'parentCollapsed',
    cellRenderer: ({ row }) => row._id ? <ActionsCell orderId={row._id as string} /> : null,
  },
]

// ─── Status filter pills ───────────────────────────────────────────────────────

const STATUS_FILTERS: Array<{ key: StatusKey | null; label: string }> = [
  { key: null,          label: 'Усі' },
  { key: 'new',         label: 'Нові' },
  { key: 'in_progress', label: 'В роботі' },
  { key: 'dispatched',  label: 'Відправлено' },
  { key: 'done',        label: 'Виконано' },
  { key: 'cancelled',   label: 'Скасовано' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

const ProductionOrdersPage = () => {
  const navigate = useNavigate({ from: productionOrdersRoute.to })
  const { openDialog, closeDialog } = useContext(DialogContext)
  const [inputValue, setInputValue] = useState('')
  const [search, setSearch] = useState<string | undefined>(undefined)
  const [status, setStatus] = useState<StatusKey | null>(null)

  const { mutate: createOrder } = useCreateProductionOrder(closeDialog)
  const { mutate: syncOrders, isPending: isSyncing } = useSyncKeyCrmOrders()

  const handleOpenCreate = () => {
    openDialog({
      title: 'Нове замовлення',
      withForm: true,
      formId: 'create-order-form',
      content: (
        <CreateOrderForm
          formId="create-order-form"
          actionSubmit={values => createOrder({
            keycrmOrderId:   values.keycrmOrderId,
            keycrmManager:   values.keycrmManager || undefined,
            plannedShipDate: values.plannedShipDate ?? Date.now(),
          })}
        />
      ),
    })
  }

  const { data, isLoading } = useQuery(
    convexQuery(api.queries.orders.getAllProductionOrdersWithProgress, {
      search: search || undefined,
      status: status ?? undefined,
    })
  )
  const rows = useMemo(() => data ?? [], [data])

  const handleSearch = () => setSearch(inputValue.trim() || undefined)

  const handleCellClick = ({ row }: CellClickProps) => {
    const r = row as any
    if (!r._id || !Array.isArray(r.data)) return
    navigate({
      to: orderDetailsRoute.to,
      params: { orderId: r._id },
    })
  }

  return (
    <div className="flex flex-col h-full p-3 gap-3">
      <div className="flex items-center justify-between shrink-0">
        <h1 className="text-base font-semibold">Виробничі замовлення</h1>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-7 px-2" disabled={isSyncing} onClick={() => syncOrders()}>
            <RefreshCw size={14} className={cn(isSyncing ? 'animate-spin' : '')}/>
            KeyCRM
          </Button>
          <Button size="sm" className="h-7 px-2" onClick={handleOpenCreate}>
            <Plus size={14} /> Додати замовлення
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 flex-wrap">
      <form
          className="flex items-center gap-1"
          onSubmit={e => { e.preventDefault(); handleSearch() }}
        >
          <Input
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder="№ замовлення"
            className="h-7 text-xs w-52"
          />
          <Button type="submit" variant="secondary" size="sm" className="h-7 px-2">
            <Search size={14} />
          </Button>
        </form>
        <Divider type="vertical" className="h-4 mx-4" />
        {/* Status filter */}
        <div className="flex items-center gap-1">
          {STATUS_FILTERS.map(({ key, label }) => (
            <button
              key={String(key)}
              type="button"
              onClick={() => setStatus(key)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                status === key
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <AppTable
        editColumns
        expandAll={false}
        enableStickyParents
        shouldPaginate
        rowsPerPage={50}
        rows={rows}
        isLoading={isLoading}
        defaultHeaders={headers}
        getRowId={({ row }) => (row._id ?? row.sku) as string}
        height="calc(100vh - 180px)"
        onCellClick={handleCellClick}
      />
    </div>
  )
}

export default ProductionOrdersPage
