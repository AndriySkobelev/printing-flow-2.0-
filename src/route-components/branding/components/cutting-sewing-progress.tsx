import { useState } from 'react'
import { ProgressBar } from '@/components/progress-bar'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from 'convex/_generated/api'
import { type FunctionReturnType } from 'convex/server'

type Progress = NonNullable<FunctionReturnType<typeof api.queries.sewing.getOrderCuttingAndSewingProgress>>

const formatTime = (ts: number) =>
  new Date(ts).toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

const SEWING_TYPE_LABEL: Record<string, string> = {
  completed:      'Готово',
  defect_fabric:  'Брак тканини',
  defect_sewing:  'Брак пошиву',
}

const CuttingLogsPanel = ({ logs }: { logs: Progress['cutting']['logs'] }) => {
  if (logs.length === 0)
    return <p className="text-[11px] text-muted-foreground text-center py-2">Немає записів</p>

  return (
    <div className="flex flex-col divide-y divide-border/40">
      {logs.map((log, i) => (
        <div key={i} className="flex items-center gap-2 py-1 text-[11px]">
          <span className="text-muted-foreground tabular-nums shrink-0">{formatTime(log.timestamp)}</span>
          <span className="font-medium truncate flex-1">{log.specName}</span>
          <span className="text-muted-foreground shrink-0">{log.color}</span>
          <span className="text-muted-foreground shrink-0">{log.size}</span>
          <span className="font-semibold tabular-nums shrink-0">{log.quantity} шт</span>
        </div>
      ))}
    </div>
  )
}

const SewingLogsPanel = ({ logs }: { logs: Progress['sewing']['logs'] }) => {
  if (logs.length === 0)
    return <p className="text-[11px] text-muted-foreground text-center py-2">Немає записів</p>

  return (
    <div className="flex flex-col divide-y divide-border/40">
      {logs.map((log, i) => (
        <div key={i} className="flex items-center gap-2 py-1 text-[11px]">
          <span className="text-muted-foreground tabular-nums shrink-0">{formatTime(log.timestamp)}</span>
          <span className="font-medium truncate flex-1">{log.userName}</span>
          {log.size && <span className="text-muted-foreground shrink-0">{log.size}</span>}
          <span className="text-muted-foreground shrink-0">{SEWING_TYPE_LABEL[log.type] ?? log.type}</span>
          <span className="font-semibold tabular-nums shrink-0">{log.quantity} шт</span>
        </div>
      ))}
    </div>
  )
}

type Props = {
  productionOrderId: string
  brandingDone: number
  brandingTotal: number
}

export const CuttingSewingProgress = ({ productionOrderId, brandingDone, brandingTotal }: Props) => {
  const [openPanel, setOpenPanel] = useState<'cutting' | 'sewing' | null>(null)

  const { data } = useQuery(
    convexQuery(api.queries.sewing.getOrderCuttingAndSewingProgress, {
      productionOrderId: productionOrderId as any,
    })
  )

  if (!data) return null

  const { cutting, sewing } = data

  const toggle = (panel: 'cutting' | 'sewing') =>
    setOpenPanel(prev => prev === panel ? null : panel)

  return (
    <div className="px-3 py-2 border-b flex flex-col gap-2 w-full">
      <div className='flex gap-2 items-center w-full'>
        {/* Cutting */}
        <div className="flex flex-col gap-0.5 w-full">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Розкрій</span>
            <span className="tabular-nums">{cutting.done}/{cutting.total} шт</span>
          </div>
          <button type="button" className="w-full" onClick={() => toggle('cutting')} title="Переглянути записи розкрою">
            <ProgressBar done={cutting.done} total={cutting.total} size="md" color="bg-sky-500" />
          </button>
        </div>

        {/* Sewing */}
        <div className="flex flex-col w-full gap-0.5">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Пошив</span>
            <span className="tabular-nums">{sewing.done}/{sewing.total} шт</span>
          </div>
          <button type="button" className="w-full" onClick={() => toggle('sewing')} title="Переглянути записи пошиву">
            <ProgressBar done={sewing.done} total={sewing.total} size="md" color="bg-violet-500" />
          </button>
        </div>

        {/* Branding */}
        {brandingTotal > 0 && (
          <div className="flex flex-col w-full gap-0.5">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Брендування</span>
              <span className="tabular-nums">{brandingDone}/{brandingTotal} шт</span>
            </div>
            <ProgressBar done={brandingDone} total={brandingTotal} size="md" />
          </div>
        )}
      </div>

      {/* Logs panel */}
      {openPanel === 'cutting' && (
        <div className="pt-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
            Записи розкрою
          </p>
          <CuttingLogsPanel logs={cutting.logs} />
        </div>
      )}
      {openPanel === 'sewing' && (
        <div className="pt-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
            Записи пошиву
          </p>
          <SewingLogsPanel logs={sewing.logs} />
        </div>
      )}
    </div>
  )
}
