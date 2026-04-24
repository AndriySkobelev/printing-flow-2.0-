import { useState, useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { CalendarIcon } from 'lucide-react'
import { type HeaderObject } from 'simple-table-core'
import clsx from 'clsx'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import AppTable from '@/components/ui/app-table'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from 'convex/_generated/api'
import { MyPopover } from '@/components/my-popover'
import { SizeInfo } from './components/size-info'
import { SpecInfo, type SpecData } from './components/spec-info'
import { OrderInfo } from './components/order-info'

// ─── Types ────────────────────────────────────────────────────────────────────

const SIZES = ['4XS', '3XS', 'XXS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'] as const
type Size = typeof SIZES[number]

const ORDER_TYPES = {
  hoodie:     { label: 'Худі',     mins: 55 },
  sweatshirt: { label: 'Світшот', mins: 45 },
  tshirt:     { label: 'Футболка', mins: 25 },
  other:      { label: 'Інше',     mins: 0  },
} as const
type OrderType = keyof typeof ORDER_TYPES

const STATUSES = {
  new:         { label: 'Нове',      color: '#378ADD' },
  in_progress: { label: 'В роботі', color: '#1D9E75' },
  done:        { label: 'Готово',    color: '#639922' },
  delayed:     { label: 'Затримка', color: '#D85A30' },
} as const
type Status = keyof typeof STATUSES

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
}

interface Order {
  id: string
  number: string
  manager: string | null
  specName: string
  spec: SpecData | null
  material: string
  color: string
  sizes: Partial<Record<Size, number>>
  sizeDetails: SizeDetail[]
  deadline: string
  status: Status
  note: string
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

// ─── Table headers ────────────────────────────────────────────────────────────

const makeHeaders = (onSchedule: (row: OrderRow) => void): Array<HeaderObject> => [
  { accessor: 'number', label: '№ замовл.', width: 100, isSortable: true, type: 'string',
    cellRenderer: ({ row }) => {
      const o = row as OrderRow
      if (!o.manager) return <span className="text-sm">{o.number}</span>
      return (
        <MyPopover
          align="start"
          withArrow
          trigger={
            <button className="text-sm text-left underline decoration-dotted underline-offset-2 cursor-pointer hover:text-primary transition-colors">
              {o.number}
            </button>
          }
          content={<OrderInfo manager={o.manager} />}
        />
      )
    },
  },
  {
    accessor: 'specName', label: 'Виріб', width: 140, isSortable: true, type: 'string',
    cellRenderer: ({ row }) => {
      const o = row as OrderRow
      if (!o.spec) return <span className="text-sm">{o.specName}</span>
      return (
        <MyPopover
          align="start"
          withArrow
          trigger={
            <button className="text-sm text-left underline decoration-dotted underline-offset-2 cursor-pointer hover:text-primary transition-colors">
              {o.specName}
            </button>
          }
          content={<SpecInfo spec={o.spec} />}
        />
      )
    },
  },
  { accessor: 'material', label: 'Матеріал', width: 160, isSortable: true, type: 'string' },
  { accessor: 'color',    label: 'Колір',    width: 120, isSortable: true, type: 'string' },
  ...SIZES.map((s): HeaderObject => ({
    accessor: `sz_${s}`,
    label: s,
    align: 'center',
    width: 52,
    isSortable: true,
    type: 'number',
    cellRenderer: ({ row }) => {
      const o = row as OrderRow
      const n = o[`sz_${s}`] as number | null
      if (!n) return <span className="text-muted-foreground text-xs">—</span>
      const detail = o.sizeDetails?.find((d: SizeDetail) => d.size === s)
      const hasComment = !!detail?.comment
      const completed = detail?.completedQty ?? 0
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
            <Button variant="ghost" size="icon-sm" className={clsx('relative w-9 h-9 text-sm font-normal', bgClass)}>
              {n}
              {hasComment && <span className="absolute -top-1 -right-1 size-2 rounded-full bg-amber-400" />}
            </Button>
          }
          content={
            <SizeInfo
              detail={detail ?? { _id: '', size: s, quantity: n, completedQty: 0 }}
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
    accessor: 'deadline', label: 'Дата видачі', width: 110, isSortable: true, type: 'string',
    cellRenderer: ({ row }) => {
      const d = (row as OrderRow).deadline
      const urgent = daysUntil(d) < 7 && (row as OrderRow).status !== 'done'
      return <span className={clsx('text-sm', urgent && 'text-red-500 font-medium')}>{d}</span>
    },
  },
    {
    accessor: 'deadline', label: 'Дата видачі', width: 110, isSortable: true, type: 'string',
    cellRenderer: ({ row }) => {
      const d = (row as OrderRow).deadline
      const urgent = daysUntil(d) < 7 && (row as OrderRow).status !== 'done'
      return <span className={clsx('text-sm', urgent && 'text-red-500 font-medium')}>{d}</span>
    },
  },
    {
    accessor: 'deadline', label: 'Дата видачі', width: 110, isSortable: true, type: 'string',
    cellRenderer: ({ row }) => {
      const d = (row as OrderRow).deadline
      const urgent = daysUntil(d) < 7 && (row as OrderRow).status !== 'done'
      return <span className={clsx('text-sm', urgent && 'text-red-500 font-medium')}>{d}</span>
    },
  },
  {
    accessor: 'status', label: 'Статус', width: 110, isSortable: true, type: 'string',
    cellRenderer: ({ row }) => {
      const s = (row as OrderRow).status as Status
      return (
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full flex-shrink-0" style={{ backgroundColor: STATUSES[s].color }} />
          <span className="text-sm">{STATUSES[s].label}</span>
        </span>
      )
    },
  },
  {
    accessor: 'note', label: 'Примітка', width: 180, type: 'string',
    cellRenderer: ({ row }) => (
      <span className="text-sm text-muted-foreground truncate">{(row as OrderRow).note || '—'}</span>
    ),
  },
  {
    accessor: 'actions', label: '', width: 60, type: 'string',
    cellRenderer: ({ row }) => (
      <Button size="icon-sm" variant="ghost" title="Запланувати" onClick={e => { e.stopPropagation(); onSchedule(row as OrderRow) }}>
        <CalendarIcon size={14} />
      </Button>
    ),
  },
]

// ─── Main component ───────────────────────────────────────────────────────────

type TypeFilter = 'all' | string

export default function ProductionCut() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const { data: rawTasks = [] } = useQuery(convexQuery(api.queries.cutting.getAllCuttingTasks, {}))
  console.log("🚀 ~ ProductionCut ~ rawTasks:", rawTasks)

  const orders: Order[] = useMemo(() =>
    rawTasks.map(task => ({
      id:       task._id,
      number:   task.keycrmOrderId,
      manager:  task.keycrmManager ?? null,
      type:     deriveType(task.specName),
      material: task.fabric,
      color:    task.color,
      specName:    task.specName,
      spec:        (task.spec as SpecData | null) ?? null,
      sizes:       task.sizesMap as Partial<Record<Size, number>>,
      sizeDetails: task.sizes.map(s => ({
        _id:          s._id,
        size:         s.size,
        quantity:     s.quantity,
        completedQty: s.completedQty,
        comment:      s.comment,
        logs:         s.logs ?? [],
      })),
      deadline: formatDate(task.endDate),
      status:   task.status as Status,
      note:     task.note ?? '',
    })),
  [rawTasks])

  const handleSchedule = (row: OrderRow) => {
    navigate({ to: '/app/planner', search: { orderId: row.id } as any })
  }

  const specNames = useMemo(() => [...new Set(orders.map(o => o.specName))], [orders])

  const headers = useMemo(() => makeHeaders(handleSchedule), [])

  const rows = useMemo(() => {
    const q = search.toLowerCase()
    return orders
      .filter(o => {
        const matchSearch = !q || o.number.toLowerCase().includes(q) || o.material.toLowerCase().includes(q) || o.color.toLowerCase().includes(q)
        const matchType = typeFilter === 'all' || o.specName === typeFilter
        return matchSearch && matchType
      })
      .map(toRow)
  }, [orders, search, typeFilter])

  const stats = useMemo(() => ({
    total:       orders.length,
    qty:         orders.reduce((s, o) => s + totalQty(o.sizes), 0),
    in_progress: orders.filter(o => o.status === 'in_progress').length,
    urgent:      orders.filter(o => !!o.deadline && daysUntil(o.deadline) < 7 && o.status !== 'done').length,
  }), [orders])

  return (
    <div className="flex flex-col gap-4 p-4">

      {/* Stats */}
      <div className="flex flex-wrap gap-2">
        {([
          { label: 'Замовлень',  value: stats.total,  bg: 'bg-primary/10 text-primary' },
          { label: 'Виробів',    value: stats.qty,    bg: 'bg-blue-50 text-blue-700' },
          { label: 'В роботі',   value: stats.in_progress, bg: 'bg-green-50 text-green-700' },
          { label: 'Термінових', value: stats.urgent, bg: 'bg-red-50 text-red-600' },
        ] as const).map(s => (
          <div key={s.label} className={clsx('flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium', s.bg)}>
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
        <div className="flex gap-1">
          <Button size="sm" variant={typeFilter === 'all' ? 'default' : 'outline'} onClick={() => setTypeFilter('all')}>
            Всі
          </Button>
          {specNames.map(name => (
            <Button key={name} size="sm" variant={typeFilter === name ? 'default' : 'outline'} onClick={() => setTypeFilter(name)}>
              {name}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <AppTable
        rows={rows}
        height={600}
        defaultHeaders={headers}
        getRowId={({ row }) => (row as OrderRow).id}
      />
    </div>
  )
}
