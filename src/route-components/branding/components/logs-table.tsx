import { useMemo } from 'react'
import { type HeaderObject } from 'simple-table-core'
import AppTable from '@/components/ui/app-table'

type BrandingLog = {
  _id: string
  type: string
  quantity: number
  timestamp: number
  comment?: string
  productionOrderItemId: string
}

type OrderItem = { _id: string; name: string; color: string; size: string }

const LOG_TYPE_CONFIG: Record<string, { label: string; className: string }> = {
  completed:     { label: 'Виконано',      className: 'text-green-700 bg-green-100' },
  defect_fabric: { label: 'Брак тканини',  className: 'text-red-600 bg-red-100' },
  defect_print:  { label: 'Брак друку',    className: 'text-orange-600 bg-orange-100' },
}

const formatDateTime = (ts: number) =>
  new Date(ts).toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

type LogRow = BrandingLog & { productName: string; productSize: string }

const HEADERS: HeaderObject[] = [
  {
    accessor: 'timestamp',
    label: 'Час',
    width: 110,
    type: 'number',
    isSortable: true,
    cellRenderer: ({ row }) => (
      <span className="text-xs text-muted-foreground">{formatDateTime((row as LogRow).timestamp)}</span>
    ),
  },
  {
    accessor: 'productName',
    label: 'Товар',
    width: 160,
    type: 'string',
    isSortable: true,
    cellRenderer: ({ row }) => {
      const r = row as LogRow
      return (
        <span className="flex items-baseline gap-1.5">
          <span className="text-sm font-medium truncate">{r.productName}</span>
          <span className="text-xs text-muted-foreground shrink-0">{r.productSize}</span>
        </span>
      )
    },
  },
  {
    accessor: 'type',
    label: 'Тип',
    width: 130,
    type: 'string',
    isSortable: true,
    cellRenderer: ({ row }) => {
      const cfg = LOG_TYPE_CONFIG[(row as LogRow).type] ?? { label: (row as LogRow).type, className: 'text-muted-foreground bg-muted' }
      return (
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${cfg.className}`}>{cfg.label}</span>
      )
    },
  },
  {
    accessor: 'quantity',
    label: 'Кількість',
    width: 90,
    type: 'number',
    isSortable: true,
    align: 'center',
    cellRenderer: ({ row }) => (
      <span className="text-sm font-medium">{(row as LogRow).quantity} шт</span>
    ),
  },
  {
    accessor: 'comment',
    label: 'Коментар',
    width: 180,
    type: 'string',
    cellRenderer: ({ row }) => (
      <span className="text-xs text-muted-foreground">{(row as LogRow).comment ?? '—'}</span>
    ),
  },
]

type Props = {
  logs: BrandingLog[]
  orderItems: OrderItem[]
}

export const LogsTable = ({ logs, orderItems }: Props) => {
  const itemMap = useMemo(
    () => Object.fromEntries(orderItems.map(i => [i._id, i])),
    [orderItems]
  )

  const rows: LogRow[] = useMemo(
    () =>
      [...logs]
        .sort((a, b) => b.timestamp - a.timestamp)
        .map(log => {
          const item = itemMap[log.productionOrderItemId]
          return {
            ...log,
            productName: item?.name ?? '—',
            productSize: item?.size ?? '',
          }
        }),
    [logs, itemMap]
  )

  return (
    <AppTable
      rows={rows}
      defaultHeaders={HEADERS}
      height={300}
      getRowId={({ row }) => (row as LogRow)._id}
    />
  )
}
