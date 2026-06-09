import { useCallback, useContext, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { type HeaderObject, type CellClickProps } from 'simple-table-core'
import { Route as orderDetailsRoute } from '@/routes/_authenticated/app/production-orders_.$orderId'
import { Route as productionOrdersRoute } from '@/routes/_authenticated/app/production-orders'
import { api } from 'convex/_generated/api'
import AppTable from '@/components/ui/app-table'
import { DialogContext } from '@/contexts/dialog'
import { Outlet, useNavigate } from '@tanstack/react-router'

// ─── Progress bar cell ────────────────────────────────────────────────────────

const mkProgressCell = (doneKey: string, totalKey: string, color: string) =>
  ({ row }: { row: Record<string, unknown> }) => {
    const done  = (row[doneKey]  as number) ?? 0
    const total = (row[totalKey] as number) ?? 0
    if (total === 0) return <span className="text-[10px] text-muted-foreground">—</span>
    const pct = Math.min(100, Math.round((done / total) * 100))
    return (
      <div className="flex flex-col gap-0.5 w-full pr-2">
        <div className="flex justify-between text-[10px] text-muted-foreground leading-none">
          <span className="tabular-nums">{done}/{total}</span>
          <span className="tabular-nums">{pct}%</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-border overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
        </div>
      </div>
    )
  }

// ─── Headers ──────────────────────────────────────────────────────────────────

const formatDate = (ts: number) =>
  new Date(ts).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: '2-digit' })

const headers: HeaderObject[] = [
  // ── Group (order) row columns ──────────────────────────────────────────────
  {
    accessor:   'group',
    label:      'Замовлення',
    width:      130,
    minWidth:   100,
    type:       'string',
    expandable: true,
    showWhen:   'always',
    collapsible: true,
    
  },
  {
    accessor: 'keycrmManager',
    label:    'Менеджер',
    width:    130,
    minWidth: 80,
    type:     'string',
    showWhen: 'parentCollapsed',
  },
  {
    accessor:     'cutProgress',
    label:        'Розкрій',
    width:        150,
    minWidth:     100,
    type:         'string',
    cellRenderer: mkProgressCell('cutDone', 'cutTotal', '#0ea5e9'),
    showWhen:     'parentCollapsed',
  },
  {
    accessor:     'sewProgress',
    label:        'Пошив',
    width:        150,
    minWidth:     100,
    type:         'string',
    cellRenderer: mkProgressCell('sewDone', 'sewTotal', '#8b5cf6'),
    showWhen:     'parentCollapsed',
  },
  {
    accessor:     'brandingProgress',
    label:        'Брендування',
    width:        150,
    minWidth:     100,
    type:         'string',
    cellRenderer: mkProgressCell('brandingDone', 'brandingTotal', '#f59e0b'),
    showWhen:     'parentCollapsed',
  },
  {
    accessor:     'packingProgress',
    label:        'Пакування',
    width:        150,
    minWidth:     100,
    type:         'string',
    cellRenderer: mkProgressCell('packingDone', 'packingTotal', '#10b981'),
    showWhen:     'parentCollapsed',
  },
  {
    accessor:   'totalQty',
    label:      'Всього шт',
    width:      90,
    minWidth:   70,
    type:       'number',
    isSortable: true,
    showWhen:   'parentCollapsed',
  },
  {
    accessor:       'plannedShipDate',
    label:          'Відвантаження',
    width:          120,
    minWidth:       90,
    type:           'string',
    isSortable:     true,
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
  const { openDialog } = useContext(DialogContext)

  const rows = useMemo(() => data ?? [], [data])

  const orderCount = useMemo(
    () => new Set(rows.map((r) => r.keycrmOrderId)).size,
    [rows],
  )

  const handleCellClick = ({ row }: CellClickProps) => {
    const r = row as any
    if (!r.keycrmOrderId) return
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
