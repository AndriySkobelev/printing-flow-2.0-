import { useQuery } from '@tanstack/react-query'
import { useMutation } from 'convex/react'
import { convexQuery } from '@convex-dev/react-query'
import { api } from 'convex/_generated/api'
import { type Id } from 'convex/_generated/dataModel'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Eye, EyeOff } from 'lucide-react'

type Diff = Record<string, { from: any; to: any }>

type Log = {
  _id: string
  type: 'split' | 'created' | 'deleted' | 'updated'
  timestamp: number
  keyCrmOrderId: string
  userName:      string
  itemName:      string | null
  itemColor:     string | null
  itemSize:      string | null
  changes?:      Diff
  shownToUserId?: string
}

const TYPE_CONFIG: Record<string, { label: string; className: string }> = {
  split:   { label: 'Розподіл', className: 'bg-blue-100 text-blue-700' },
  created: { label: 'Створено', className: 'bg-green-100 text-green-700' },
  deleted: { label: 'Видалено', className: 'bg-red-100 text-red-700' },
  updated: { label: 'Оновлено', className: 'bg-amber-100 text-amber-700' },
}

const FIELD_LABELS: Record<string, string> = {
  quantity:            'Кількість',
  shipmentType:        'Тип відвантаження',
  brandingType:        'Брендування (готове)',
  cuttingBrandingType: 'Брендування (крої)',
  brandingComment:     'Коментар брендування',
  sewingComment:       'Коментар пошиву',
  destination:         'Призначення',
}

const VALUE_LABELS: Record<string, string> = {
  customer:      'Клієнт',
  warehouse:     'Склад',
  defects:       'Брак',
  manufacturing: 'Виробництво',
}

const formatValue = (v: any): string => {
  if (v === null || v === undefined) return '—'
  if (Array.isArray(v)) return v.length ? v.map(i => VALUE_LABELS[i] ?? i).join(', ') : '—'
  return VALUE_LABELS[v] ?? String(v)
}

const formatDateTime = (ts: number) =>
  new Date(ts).toLocaleString('uk-UA', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })

type Props = {
  productionOrderId: string
  filter?: (log: Log) => boolean
  currentUserId?: string
}

export const OrderLogs = ({ productionOrderId, filter, currentUserId }: Props) => {
  const { data: rawLogs = [], isPending } = useQuery(
    convexQuery(api.queries.orders.getOrderLogs, {
      productionOrderId: productionOrderId as Id<'productionOrders'>,
    })
  )
  const markSeen = useMutation(api.queries.orders.markOrderLogSeen)

  const logs = filter ? (rawLogs as Log[]).filter(filter) : (rawLogs as Log[])

  if (isPending) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="size-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center">
        <p className="text-sm text-muted-foreground">Немає записів</p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-2 p-4">
        {logs.map(log => {
          const cfg        = TYPE_CONFIG[log.type] ?? { label: log.type, className: 'bg-muted text-muted-foreground' }
          const diffEntries = Object.entries(log.changes ?? {})
          const seen       = !!log.shownToUserId
          return (
            <div key={log._id} className="border rounded-md px-3 py-2.5 flex flex-col gap-1.5">

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded-full ${cfg.className}`}>
                    {cfg.label}
                  </span>
                  <span className="text-[11px] font-medium text-muted-foreground">
                    #{log.keyCrmOrderId}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[11px] text-muted-foreground">
                    {formatDateTime(log.timestamp)}
                  </span>
                  {currentUserId && (
                    <button
                      title={seen ? 'Переглянуто' : 'Позначити як переглянуте'}
                      onClick={() => { if (!seen) markSeen({ logId: log._id as Id<'productionOrderLogs'> }) }}
                      className={seen
                        ? 'text-green-500 cursor-default'
                        : 'text-muted-foreground hover:text-foreground transition-colors cursor-pointer'
                      }
                    >
                      {seen ? <Eye size={13} /> : <EyeOff size={13} />}
                    </button>
                  )}
                </div>
              </div>

              {log.itemName && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm font-medium">{log.itemName}</span>
                  {log.itemSize && (
                    <span className="px-2 py-0.5 rounded-full border text-muted-foreground text-xs">
                      {log.itemSize}
                    </span>
                  )}
                  {log.itemColor && (
                    <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs">
                      {log.itemColor}
                    </span>
                  )}
                </div>
              )}

              {diffEntries.length > 0 && (
                <div className="flex flex-col gap-1 mt-0.5">
                  {diffEntries.map(([field, { from, to }]) => {
                    const fromStr = formatValue(from)
                    const toStr   = formatValue(to)
                    return (
                      <div key={field} className="flex items-baseline gap-1.5 text-[11px]">
                        <span className="text-muted-foreground shrink-0">
                          {FIELD_LABELS[field] ?? field}:
                        </span>
                        {fromStr !== '—' && (
                          <>
                            <span className="line-through text-muted-foreground/60">{fromStr}</span>
                            <span className="text-muted-foreground">→</span>
                          </>
                        )}
                        <span className="text-foreground font-medium">{toStr}</span>
                      </div>
                    )
                  })}
                </div>
              )}

              <span className="text-[11px] text-muted-foreground self-end">{log.userName}</span>

            </div>
          )
        })}
      </div>
    </ScrollArea>
  )
}
