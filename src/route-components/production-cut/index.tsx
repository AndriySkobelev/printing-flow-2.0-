import { useState, useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { CalendarIcon } from 'lucide-react'
import { type HeaderObject } from 'simple-table-core'
import clsx from 'clsx'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import AppTable from '@/components/ui/app-table'
import { useQuery } from '@tanstack/react-query'
import { convexQuery, useConvexQuery } from '@convex-dev/react-query'
import { api } from 'convex/_generated/api'
import { useAction } from 'convex/react'

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
  new:     { label: 'Нове',      color: '#378ADD' },
  inwork:  { label: 'В роботі', color: '#1D9E75' },
  done:    { label: 'Готово',    color: '#639922' },
  delayed: { label: 'Затримка', color: '#D85A30' },
} as const
type Status = keyof typeof STATUSES

interface Order {
  id: string
  number: string
  type: OrderType
  material: string
  color: string
  sizes: Partial<Record<Size, number>>
  deadline: string
  status: Status
  note: string
}

type OrderRow = Order & { _total: number; [key: string]: any }

// ─── Mock data ────────────────────────────────────────────────────────────────

const ORDERS: Order[] = [
  { id:'1', number:'1145',   type:'hoodie',     material:'3-нитка начос',     color:'Чорний',        sizes:{ XS:5, S:15, M:25, L:25, XL:15, '2XL':5, XXS:1 }, deadline:'2026-04-15', status:'done',    note:'Середина капюшона червоний' },
  { id:'2', number:'1210',   type:'tshirt',     material:'Кулір 190',         color:'Таш',           sizes:{ S:20, M:40, L:40, XL:30, '2XL':20 },             deadline:'2026-05-12', status:'inwork',  note:'' },
  { id:'3', number:'1216',   type:'hoodie',     material:'3-нитка начос',     color:'Чорний',        sizes:{ S:70, M: 120, L:70, XL:70 },                       deadline:'2026-05-08', status:'inwork',  note:'' },
  { id:'4', number:'1223-1', type:'tshirt',     material:'Кулір 190',         color:'Чорний',        sizes:{ S:20, M:55, L:60, XL:60, '2XL':44, XXS:10 },     deadline:'2026-05-20', status:'new',     note:'' },
  { id:'5', number:'1223-3', type:'hoodie',     material:'3-нитка петля',     color:'Чорний',        sizes:{ S:3,  M:7,  L:10, XL:10, '2XL':5, XXS:3 },       deadline:'2026-05-20', status:'new',     note:'' },
  { id:'6', number:'1225',   type:'tshirt',     material:'2-нитка петля',     color:'Шампань',       sizes:{ S:3,  M:6,  L:20, XL:14, '2XL':4, XXS:1 },       deadline:'2026-05-04', status:'inwork',  note:'' },
  { id:'7', number:'1228',   type:'tshirt',     material:'Кулір 190',         color:'Коричневий',    sizes:{ S:5, M:3 },                                       deadline:'2026-04-27', status:'delayed', note:'' },
  { id:'8', number:'1231',   type:'tshirt',     material:'Кулір 190',         color:'Білий/Зелений', sizes:{ S:2, M:7, L:7, XL:4 },                           deadline:'2026-04-24', status:'inwork',  note:'Спереду зелений, ззаду рожевий' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  { accessor: 'number', label: '№ замовл.', width: 100, isSortable: true, type: 'string' },
  {
    accessor: 'type', label: 'Тип', width: 100, isSortable: true, type: 'string',
    cellRenderer: ({ row }) => (
      <span className="text-sm">{ORDER_TYPES[(row as OrderRow).type]?.label}</span>
    ),
  },
  { accessor: 'material', label: 'Матеріал', width: 150, isSortable: true, type: 'string' },
  { accessor: 'color',    label: 'Колір',    width: 120, isSortable: true, type: 'string' },
  ...SIZES.map((s): HeaderObject => ({
    accessor: `sz_${s}`,
    label: s,
    width: 52,
    isSortable: true,
    type: 'number',
    cellRenderer: ({ row }) => {
      // console.log('row', row)
      const n = (row as OrderRow)[`sz_${s}`] as number | null
      if (!n) return <span className="text-muted-foreground text-xs">—</span>
      return (
        <span className="flex items-center gap-1">
          <span className={`flex items-center justify-center text-sm text-center p-1.5 bg-primary/20 rounded-md w-9 h-9`}>{n}</span>
        </span>
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

type TypeFilter = 'all' | OrderType

export default function ProductionCut() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')

  const handleSchedule = (row: OrderRow) => {
    navigate({ to: '/app/planner', search: { orderId: row.id } as any })
  }

  const headers = useMemo(() => makeHeaders(handleSchedule), [])
  console.log('headers', headers)

  const rows = useMemo(() => {
    const q = search.toLowerCase()
    return ORDERS
      .filter(o => {
        const matchSearch = !q || o.number.toLowerCase().includes(q) || o.material.toLowerCase().includes(q) || o.color.toLowerCase().includes(q)
        const matchType = typeFilter === 'all' || o.type === typeFilter
        return matchSearch && matchType
      })
      .map(toRow)
  }, [search, typeFilter])
  console.log('rows', rows)
  const stats = useMemo(() => ({
    total: ORDERS.length,
    qty: ORDERS.reduce((s, o) => s + totalQty(o.sizes), 0),
    inwork: ORDERS.filter(o => o.status === 'inwork').length,
    urgent: ORDERS.filter(o => daysUntil(o.deadline) < 7 && o.status !== 'done').length,
  }), [])

  return (
    <div className="flex flex-col gap-4 p-4">

      {/* Stats */}
      <div className="flex flex-wrap gap-2">
        {([
          { label: 'Замовлень',  value: stats.total,  bg: 'bg-primary/10 text-primary' },
          { label: 'Виробів',    value: stats.qty,    bg: 'bg-blue-50 text-blue-700' },
          { label: 'В роботі',   value: stats.inwork, bg: 'bg-green-50 text-green-700' },
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
          {([['all', 'Всі'], ['hoodie', 'Худі'], ['sweatshirt', 'Світшот'], ['tshirt', 'Футболка']] as [TypeFilter, string][]).map(([k, label]) => (
            <Button key={k} size="sm" variant={typeFilter === k ? 'default' : 'outline'} onClick={() => setTypeFilter(k)}>
              {label}
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
