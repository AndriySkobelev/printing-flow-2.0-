import { useState, useMemo, useContext, useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Check, History, ListFilter } from 'lucide-react'
import { type HeaderObject } from 'simple-table-core'
import clsx from 'clsx'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import AppTable from '@/components/ui/app-table'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from 'convex/_generated/api'
import { type Id } from 'convex/_generated/dataModel'
import { MyPopover } from '@/components/my-popover'
import { Calendar } from '@/components/ui/calendar'
import { UTCDate } from '@date-fns/utc'
import { SizeInfo } from './components/size-info'
import { type SpecData } from './components/spec-info'
import { CuttingSpecDetails } from './components/cutting-spec-details'
import { OrderInfo } from './components/order-info'
import { MaterialReservationCell, type FabricReservation } from './components/material-reservation'
import { OrderLogs } from '@/components/order-logs'
import { DrawerContext } from '@/contexts/drawer'
import { AuthContext } from '@/contexts/auth'
import { useUpdateCuttingTaskPlanedEndDate, useUpdateCuttingTaskStatus } from './actions'

// ─── Types ────────────────────────────────────────────────────────────────────

// const SIZES = ['4XS', '3XS', 'XXS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'] as const
const SIZES = ['4XS', '3XS', 'XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL', '6XL'] as const
type Size = typeof SIZES[number]

const ORDER_TYPES = {
  hoodie:     { label: 'Худі',     mins: 55 },
  sweatshirt: { label: 'Світшот', mins: 45 },
  tshirt:     { label: 'Футболка', mins: 25 },
  other:      { label: 'Інше',     mins: 0  },
} as const
type OrderType = keyof typeof ORDER_TYPES

const STATUSES = {
  new:         { label: 'Нове',             className: 'bg-blue-100 text-blue-700',     dot: 'bg-blue-500'   },
  in_progress: { label: 'В роботі',         className: 'bg-amber-100 text-amber-800',   dot: 'bg-amber-500'  },
  paused:      { label: 'На паузі',         className: 'bg-gray-100 text-gray-600',     dot: 'bg-gray-400'   },
  waiting:     { label: 'Очікуєм тканину',  className: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
  done:        { label: 'Виконано',         className: 'bg-green-500 text-white',       dot: 'bg-green-500'  },
} as const
type Status = keyof typeof STATUSES
type StatusConfig = (typeof STATUSES)[Status]

const StatusChip = ({ cfg, className }: { cfg: StatusConfig; className?: string }) => (
  <span className={clsx('inline-flex h-7 items-center rounded-md px-2 text-xs font-medium whitespace-nowrap', cfg.className, className)}>
    {cfg.label}
  </span>
)

export type SizeLog = {
  quantity: number
  timestamp: number
  userId: string
  comment?: string
}

export type SizeDetail = {
  _id: string
  size: string
  quantity: number
  completedQty: number
  comment?: string
  logs?: SizeLog[]
  quantityChange?: { logId: string; oldQty: number } | null
  isCustomCut?: boolean
  customCutComment?: string | null
}

interface Order {
  id: string
  productionOrderId: string
  number: string
  manager: string | null
  specName: string
  spec: SpecData | null
  material: string
  fabricReservations: FabricReservation[]
  color: string
  sizes: Partial<Record<Size, number>>
  sizeDetails: SizeDetail[]
  deadline: string
  planedEndDate?: number
  status: Status
  note: string
  isCustomCut: boolean
  customCutComment: string | null
  hasCustomSpec: boolean
  relevantLogsCount: number
  unseenLogsCount: number
}

type OrderRow = Order & { _total: number; [key: string]: any }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function deriveType(specName: string): OrderType {
  const n = specName.toLowerCase()
  if (n.includes('худі') || n.includes('hoodie')) return 'hoodie'
  if (n.includes('світшот') || n.includes('sweatshirt')) return 'sweatshirt'
  if (n.includes('футболка') || n.includes('tshirt')) return 'tshirt'
  return 'other'
}

function formatDate(ts?: number): string {
  if (!ts) return ''
  return new Date(ts).toISOString().slice(0, 10)
}

const totalQty = (sizes: Partial<Record<Size, number>>) =>
  Object.values(sizes).reduce((s, n) => s + (n ?? 0), 0)

const daysUntil = (dateStr: string) =>
  Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000)

const toRow = (o: Order): OrderRow => ({
  ...o,
  _total: totalQty(o.sizes),
  ...Object.fromEntries(SIZES.map(s => [`sz_${s}`, o.sizes[s] ?? null])),
})

// ─── Inline cell components ───────────────────────────────────────────────────

const PlanedDateCell = ({ row, onUpdate }: { row: OrderRow; onUpdate: (id: string, date: number | null) => void }) => {
  const [open, setOpen] = useState(false)
  const d = row.planedEndDate
  return (
    <MyPopover
      open={open}
      onOpenChange={setOpen}
      align="start"
      trigger={
        <button className="text-sm hover:text-primary transition-colors text-left">
          {d ? formatDate(d) : <span className="text-muted-foreground/40">Запланувати...</span>}
        </button>
      }
      content={
        <Calendar
          mode="single"
          selected={d ? new UTCDate(d) : undefined}
          defaultMonth={d ? new UTCDate(d) : new UTCDate()}
          onSelect={date => { onUpdate(row.id, date ? new UTCDate(date).valueOf() : null); setOpen(false) }}
        />
      }
    />
  )
}

const STATUS_ENTRIES = Object.entries(STATUSES) as [Status, StatusConfig][]

const DEFAULT_STATUS_FILTER: Status[] = ['new', 'in_progress', 'waiting']
const ACTIVE_STATUSES: Status[] = ['new', 'in_progress']

const StatusOption = ({ cfg, active, onClick }: { cfg: StatusConfig; active: boolean; onClick: () => void }) => (
  <Button
    variant="ghost"
    className={clsx('h-9 justify-start gap-2.5 px-2 font-normal', active && 'bg-muted')}
    onClick={onClick}
  >
    <span className={clsx('size-2.5 shrink-0 rounded-sm', cfg.dot)} />
    <span className="flex-1 text-left">{cfg.label}</span>
    {active && <Check size={14} className="text-primary" />}
  </Button>
)

const StatusFilter = ({ selected, onChange }: { selected: Status[]; onChange: (s: Status[]) => void }) => {
  const toggle = (key: Status) =>
    onChange(selected.includes(key) ? selected.filter(k => k !== key) : [...selected, key])
  return (
    <MyPopover
      align="start"
      trigger={
        <Button variant="outline" className={clsx('h-9 gap-2 px-3 font-normal', selected.length > 0 && 'border-primary/60')}>
          <ListFilter size={14} />
          Статус
          {selected.length > 0 && (
            <span className="flex items-center gap-1">
              {STATUS_ENTRIES.filter(([key]) => selected.includes(key)).map(([key, cfg]) => (
                <span key={key} className={clsx('size-2.5 rounded-sm', cfg.dot)} title={cfg.label} />
              ))}
            </span>
          )}
        </Button>
      }
      content={
        <div className="flex min-w-56 flex-col gap-0.5">
          <span className="px-2 pb-1.5 text-xs font-medium text-muted-foreground">Статус крою</span>
          {STATUS_ENTRIES.map(([key, cfg]) => (
            <StatusOption key={key} cfg={cfg} active={selected.includes(key)} onClick={() => toggle(key)} />
          ))}
          <div className="mt-1 flex gap-1 border-t pt-1.5">
            <Button variant="ghost" size="sm" className="flex-1 text-xs" onClick={() => onChange(DEFAULT_STATUS_FILTER)}>
              За замовчуванням
            </Button>
            <Button variant="ghost" size="sm" className="flex-1 text-xs" onClick={() => onChange([])}>
              Скинути
            </Button>
          </div>
        </div>
      }
    />
  )
}

const StatusCell = ({ row, onUpdate }: { row: OrderRow; onUpdate: (id: string, status: Status) => void }) => {
  const [open, setOpen] = useState(false)
  const s = row.status
  return (
    <MyPopover
      open={open}
      onOpenChange={setOpen}
      align="start"
      trigger={
        <Button variant="ghost" className="h-auto p-0 hover:bg-transparent hover:opacity-80">
          <StatusChip cfg={STATUSES[s]} />
        </Button>
      }
      content={
        <div className="flex min-w-56 flex-col gap-0.5">
          <span className="px-2 pb-1.5 text-xs font-medium text-muted-foreground">Статус крою</span>
          {STATUS_ENTRIES.map(([key, cfg]) => (
            <StatusOption
              key={key}
              cfg={cfg}
              active={key === s}
              onClick={() => { if (key !== s) onUpdate(row.id, key); setOpen(false) }}
            />
          ))}
        </div>
      }
    />
  )
}

// Spec elements this cutting task actually uses — the items' edited copies
// where they exist (see getCuttingTaskSpecDetails), with changes vs the base marked.
const SpecCell = ({ row }: { row: OrderRow }) => (
  <MyPopover
    align="start"
    withArrow
    trigger={
      <Button
        variant="ghost"
        className="relative h-auto min-w-0 max-w-full p-0 text-sm font-normal text-left whitespace-normal capitalize hover:bg-transparent hover:text-primary"
      >
        <span className="line-clamp-2 leading-tight break-words" title={row.specName}>{row.specName}</span>
        {row.hasCustomSpec && (
          <span className="absolute -top-2.5 left-0 rounded bg-violet-100 px-1 text-[9px] font-medium leading-4 text-violet-700 normal-case">
            Змінено
          </span>
        )}
      </Button>
    }
    content={<CuttingSpecDetails cuttingTaskId={row.id as Id<'cuttingTasks'>} productName={row.specName} color={row.color} />}
  />
)

// ─── Table headers ────────────────────────────────────────────────────────────

const relevantLogFilter = (log: { type: string; changes?: Record<string, unknown> | null }) =>
  log.type === 'created' ||
  log.type === 'deleted' ||
  (log.type === 'updated' && !!log.changes && 'quantity' in log.changes)

const makeHeaders = (
  onSchedule: (row: OrderRow) => void,
  onOpenLogs: (row: OrderRow) => void,
  onUpdateDate: (id: string, date: number | null) => void,
  onUpdateStatus: (id: string, status: Status) => void,
): Array<HeaderObject> => [
  { accessor: 'number', label: '№', width: 90, isSortable: true, type: 'string',
    cellRenderer: ({ row }) => {
      const o = row as OrderRow
      const numberEl = o.manager ? (
        <MyPopover
          align="start"
          withArrow
          trigger={
            <button className="text-sm text-left text-primary/70 decoration-dotted underline-offset-2 cursor-pointer hover:text-primary transition-colors">
              {o.number}
            </button>
          }
          content={<OrderInfo manager={o.manager} />}
        />
      ) : (
        <span className="text-sm">{o.number}</span>
      )

      const hasLogs    = o.relevantLogsCount > 0
      const hasUnseen  = o.unseenLogsCount   > 0
      const iconColor  = !hasLogs   ? 'text-muted-foreground/30'
                       : hasUnseen  ? 'text-red-500 hover:text-red-600'
                                    : 'text-gray-300 hover:text-gray-600'

      return (
        <div
          className={clsx(
            'flex items-center gap-1.5 h-full',
            o.isCustomCut && 'border-l-2 border-violet-400 pl-1.5 -ml-1.5',
          )}
          title={o.isCustomCut ? (o.customCutComment || 'Індивідуальний крій') : undefined}
        >
          {numberEl}
          {hasLogs && (
            <button
              className={`transition-colors shrink-0 ${iconColor}`}
              onClick={e => { e.stopPropagation(); onOpenLogs(o) }}
            >
              <History size={12} />
            </button>
          )}
        </div>
      )
    },
  },
  {
    accessor: 'specName', label: 'Виріб', width: 140, isSortable: true, type: 'string',
    cellRenderer: ({ row }) => <SpecCell row={row as OrderRow} />,
  },
  {
    accessor: 'material', label: 'Матеріал', width: 160, isSortable: true, type: 'string',
    cellRenderer: ({ row }) => {
      const o = row as OrderRow
      return <MaterialReservationCell material={o.material} reservations={o.fabricReservations} />
    },
  },
  { accessor: 'color',    label: 'Колір',    width: 120, isSortable: true, type: 'string' },
  ...SIZES.map((s): HeaderObject => ({
    accessor: `sz_${s}`,
    label: s,
    align: 'center',
    width: 51,
    isSortable: true,
    type: 'number',
    cellRenderer: ({ row }) => {
      const o = row as OrderRow
      const n = o[`sz_${s}`] as number | null
      if (!n) return <span className="text-muted-foreground text-xs">—</span>
      const detail = o.sizeDetails?.find((d: SizeDetail) => d.size === s)
      const hasComment    = !!detail?.comment
      const completed     = detail?.completedQty ?? 0
      const quantityChange = detail?.quantityChange
      const bgClass = completed === 0
        ? 'bg-primary/20 hover:bg-primary/30'
        : completed > n
          ? 'bg-green-200 hover:bg-green-300 text-green-800'
          : completed === n
            ? 'bg-green-500 hover:bg-green-600 text-white'
            : 'bg-yellow-400 hover:bg-yellow-500 text-yellow-900'
      return (
        <MyPopover
          align="center"
          withArrow
          trigger={
            <Button
              variant="ghost"
              size="icon-sm"
              className={clsx('relative w-9 h-9 text-sm font-normal', bgClass, detail?.isCustomCut && 'ring-2 ring-inset ring-violet-400')}
              title={detail?.isCustomCut ? (detail.customCutComment || 'Індивідуальний крій') : undefined}
            >
              {n}
              {quantityChange && (
                <span className="absolute top-0 -right-1.5 min-w-4 h-4 px-0.5 rounded bg-red-500 text-white text-[9px] font-semibold flex items-center justify-center leading-none">
                  {quantityChange.oldQty}
                </span>
              )}
              {hasComment && <span className="absolute -top-1 -right-1 size-2 rounded-full bg-amber-400" />}
            </Button>
          }
          content={
            <SizeInfo
              detail={detail ?? { _id: '', size: s, quantity: n, completedQty: 0 }}
              onViewLogs={quantityChange ? () => onOpenLogs(o) : undefined}
            />
          }
        />
      )
    },
  })),
  {
    accessor: '_total', label: 'Заг.', width: 60, isSortable: true, type: 'number',
    cellRenderer: ({ row }) => <span className="font-medium text-sm">{(row as OrderRow)._total}</span>,
  },
  {
    accessor: 'planedEndDate', label: 'Видача крою', width: 120, isSortable: true, type: 'string',
    cellRenderer: ({ row }) => <PlanedDateCell row={row as OrderRow} onUpdate={onUpdateDate} />,
  },
    {
    accessor: 'deadline', label: 'Дата здачі', width: 110, isSortable: true, type: 'string',
    cellRenderer: ({ row }) => {
      const d = (row as OrderRow).deadline
      const urgent = daysUntil(d) < 7 && (row as OrderRow).status !== 'done'
      return <span className={clsx('text-sm', urgent && 'text-red-500 font-medium')}>{d}</span>
    },
  },
  {
    accessor: 'status', label: 'Статус', width: 140, isSortable: true, type: 'string',
    cellRenderer: ({ row }) => <StatusCell row={row as OrderRow} onUpdate={onUpdateStatus} />,
  },
  {
    accessor: 'note', label: 'Примітка', width: 180, type: 'string',
    cellRenderer: ({ row }) => (
      <span className="text-sm text-muted-foreground truncate">{(row as OrderRow).note || '—'}</span>
    ),
  },
  {
    accessor: 'customCutComment', label: 'Кастом крій', width: 200, type: 'string',
    cellRenderer: ({ row }) => {
      const comment = (row as OrderRow).customCutComment
      if (!comment) return <span className="text-muted-foreground/30 text-xs">—</span>
      return (
        <span className="text-xs text-violet-700 dark:text-violet-300 truncate" title={comment}>
          {comment}
        </span>
      )
    },
  },
]

// ─── Main component ───────────────────────────────────────────────────────────

type TypeFilter = 'all' | string

export default function ProductionCut() {
  const navigate    = useNavigate()
  const { openDrawer } = useContext(DrawerContext)
  const { user }    = useContext(AuthContext)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [statusFilter, setStatusFilter] = useState<Status[]>(DEFAULT_STATUS_FILTER)
  const { data: rawTasks = [] } = useQuery(convexQuery(api.queries.cutting.getAllCuttingTasks, {}))
  const { mutate: updateDate }   = useUpdateCuttingTaskPlanedEndDate()
  const { mutate: updateStatus } = useUpdateCuttingTaskStatus()

  const orders: Order[] = useMemo(() =>
    rawTasks.map(task => ({
      id:                task._id,
      productionOrderId: task.productionOrderId,
      number:            task?.orderIndex ?? '',
      manager:           task.keycrmManager ?? null,
      type:              deriveType(task.specName),
      material:          task.fabric,
      fabricReservations: task.fabricReservations,
      color:             task.color,
      specName:          task.specName,
      spec:              (task.spec as SpecData | null) ?? null,
      sizes:             task.sizesMap as Partial<Record<Size, number>>,
      sizeDetails:       task.sizes.map(s => ({
        _id:              s._id,
        size:             s.size,
        quantity:         s.quantity,
        completedQty:     s.completedQty,
        comment:          s.comment,
        logs:             s.logs ?? [],
        quantityChange:   (s as any).quantityChange ?? null,
        isCustomCut:      (s as any).isCustomCut ?? false,
        customCutComment: (s as any).customCutComment ?? null,
      })),
      deadline:          formatDate(task.endDate),
      planedEndDate:     task.planedEndDate,
      status:            task.status as Status,
      note:              task.note ?? '',
      isCustomCut:       (task as any).isCustomCut ?? false,
      customCutComment:  (task as any).customCutComment ?? null,
      hasCustomSpec:     task.sizes.some(s => (s as any).hasCustomSpec),
      relevantLogsCount: task.relevantLogsCount ?? 0,
      unseenLogsCount:   task.unseenLogsCount   ?? 0,
    })),
  [rawTasks])

  const handleUpdateDate = useCallback((id: string, date: number | null) => {
    updateDate({ cuttingTaskId: id as Id<'cuttingTasks'>, planedEndDate: date ?? undefined })
  }, [updateDate])

  const handleUpdateStatus = useCallback((id: string, status: Status) => {
    updateStatus({ cuttingTaskId: id as Id<'cuttingTasks'>, status })
  }, [updateStatus])

  const handleSchedule = useCallback((row: OrderRow) => {
    navigate({ to: '/app/planner', search: { orderId: row.id } as any })
  }, [navigate])

  const handleOpenLogs = useCallback((row: OrderRow) => {
    openDrawer({
      direction:  'right',
      title:      `Журнал змін #${row.number}`,
      outerClose: true,
      className:  'w-120',
      content: (
        <OrderLogs
          productionOrderId={row.productionOrderId}
          filter={relevantLogFilter as any}
          currentUserId={user?._id}
        />
      ),
    })
  }, [openDrawer, user])

  // Search + status filters only, so the spec buttons list what the table can show.
  const filteredOrders = useMemo(() => {
    const q = search.toLowerCase()
    return orders.filter(o => {
      const matchSearch = !q || o.number.toLowerCase().includes(q) || o.material.toLowerCase().includes(q) || o.color.toLowerCase().includes(q)
      const matchStatus = statusFilter.length === 0 || statusFilter.includes(o.status)
      return matchSearch && matchStatus
    })
  }, [orders, search, statusFilter])

  const specQtyByName = useMemo(() => {
    const counts = new Map<string, number>()
    for (const o of filteredOrders) counts.set(o.specName, (counts.get(o.specName) ?? 0) + totalQty(o.sizes))
    return counts
  }, [filteredOrders])

  const specNames = useMemo(() => {
    const names = [...specQtyByName.keys()]
    return typeFilter !== 'all' && !names.includes(typeFilter) ? [...names, typeFilter] : names
  }, [specQtyByName, typeFilter])

  const headers = useMemo(
    () => makeHeaders(handleSchedule, handleOpenLogs, handleUpdateDate, handleUpdateStatus),
    [handleSchedule, handleOpenLogs, handleUpdateDate, handleUpdateStatus],
  )

  const rows = useMemo(
    () => filteredOrders.filter(o => typeFilter === 'all' || o.specName === typeFilter).map(toRow),
    [filteredOrders, typeFilter],
  )

  const stats = useMemo(() => {
    const active = orders.filter(o => ACTIVE_STATUSES.includes(o.status))
    return {
      total:       active.length,
      qty:         active.reduce((s, o) => s + totalQty(o.sizes), 0),
      in_progress: orders.filter(o => o.status === 'in_progress').length,
      urgent:      orders.filter(o => !!o.deadline && daysUntil(o.deadline) < 7 && o.status !== 'done').length,
    }
  }, [orders])

  return (
    <div className="flex flex-col gap-4 p-4">

      {/* Stats */}
      <div className="flex flex-wrap gap-2">
        {([
          { label: 'Завдань',    value: stats.total,  bg: 'bg-primary/10 text-primary' },
          { label: 'Виробів',    value: stats.qty,    bg: 'bg-blue-50 text-blue-700' },
          { label: 'В роботі',   value: stats.in_progress, bg: 'bg-green-50 text-green-700' },
          { label: 'Термінових', value: stats.urgent, bg: 'bg-red-50 text-red-600' },
        ] as const).map(s => (
          <div key={s.label} className={clsx('flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium', s.bg)}>
            <span className="font-bold">{s.value}</span>
            <span className="text-xs opacity-70">{s.label}</span>
          </div>
        ))}
      </div>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          className="w-56"
          placeholder="Пошук по №, матеріалу, кольору..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <StatusFilter selected={statusFilter} onChange={setStatusFilter} />
        <div className="h-5 w-px bg-border" />
        <div className="flex gap-1">
          <Button size="sm" variant={typeFilter === 'all' ? 'default' : 'outline'} onClick={() => setTypeFilter('all')}>
            Всі
          </Button>
          {specNames.map(name => (
            <Button key={name} size="sm" variant={typeFilter === name ? 'default' : 'outline'} onClick={() => setTypeFilter(name)}>
              {name} ({specQtyByName.get(name) ?? 0})
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <AppTable
        rows={rows}
        height={600}
        rowHeight={52}
        defaultHeaders={headers}
        getRowId={({ row }) => (row as OrderRow).id}
      />
    </div>
  )
}
