import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { type HeaderObject, type CellClickProps } from 'simple-table-core'
import { Route as orderDetailsRoute } from '@/routes/_authenticated/app/production-orders_.$orderId'
import { Route as productionOrdersRoute } from '@/routes/_authenticated/app/production-orders'
import { api } from 'convex/_generated/api'
import AppTable from '@/components/ui/app-table'
import { MyPopover } from '@/components/my-popover'
import { useNavigate } from '@tanstack/react-router'

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

// ─── Headers ──────────────────────────────────────────────────────────────────
const renderHeader = ({ header }: { header: HeaderObject }) => (
  <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/50 px-2">
    {header.label}
  </span>
)

const formatDate = (ts: number) =>
  new Date(ts).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: '2-digit' })

const headers: HeaderObject[] = [
  // ── Group (order) row columns ──────────────────────────────────────────────
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
  // {
  //   accessor:     'cutProgress',
  //   label:        'Розкрій',
  //   width:        150,
  //   minWidth:     100,
  //   type:         'string',
  //   cellRenderer: mkProgressCell('cutDone', 'cutTotal', '#0ea5e9'),
  //   showWhen:     'parentCollapsed',
  // },
  // {
  //   accessor:     'sewProgress',
  //   label:        'Пошив',
  //   width:        150,
  //   minWidth:     100,
  //   type:         'string',
  //   cellRenderer: mkProgressCell('sewDone', 'sewTotal', '#8b5cf6'),
  //   showWhen:     'parentCollapsed',
  // },
  // {
  //   accessor:     'brandingProgress',
  //   label:        'Брендування',
  //   width:        150,
  //   minWidth:     100,
  //   type:         'string',
  //   cellRenderer: mkProgressCell('brandingDone', 'brandingTotal', '#f59e0b'),
  //   showWhen:     'parentCollapsed',
  // },
  // {
  //   accessor:     'packingProgress',
  //   label:        'Пакування',
  //   width:        150,
  //   minWidth:     100,
  //   type:         'string',
  //   cellRenderer: mkProgressCell('packingDone', 'packingTotal', '#10b981'),
  //   showWhen:     'parentCollapsed',
  // },
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
    width:      90,
    minWidth:   70,
    type:       'number',
    isSortable: true,
    headerRenderer: renderHeader,
    showWhen:   'parentCollapsed',
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
  }
]

// ─── Page ─────────────────────────────────────────────────────────────────────

const ProductionOrdersPage = () => {
  const navigate = useNavigate({ from: productionOrdersRoute.to});
  const { data, isLoading } = useQuery(
    convexQuery(api.queries.orders.getAllProductionOrdersWithProgress, {})
  )
  const rows = useMemo(() => data ?? [], [data])

  const orderCount = useMemo(
    () => new Set(rows.map((r) => r.keycrmOrderId)).size,
    [rows],
  )

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
        <span className="text-xs text-muted-foreground">{orderCount} замовлень</span>
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
        height="calc(100vh - 140px)"
        onCellClick={handleCellClick}
      />
    </div>
  )
}

export default ProductionOrdersPage
