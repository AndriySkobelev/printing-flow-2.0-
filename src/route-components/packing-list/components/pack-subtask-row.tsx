import { useContext } from 'react'
import { Plus, CalendarClock } from 'lucide-react'
import { type Id } from 'convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { ProgressBar } from '@/components/progress-bar'
import { CustomBadge } from '@/route-components/branding/components/custom-badge'
import { DialogContext } from '@/contexts/dialog'
import { useCreatePackagingLog } from '../actions'
import { PackingLogForm } from '../forms/packing-log-form'
import { STATUS_CONFIG, formatDateTime, initials } from '../helpers'
import { type PackagingSubTask } from '../types'

type Props = {
  subTask:          PackagingSubTask
  completedQty:     number
  defectQty:        number
  packagingTaskId:  string
}

export const PackSubTaskRow = ({ subTask, completedQty, defectQty, packagingTaskId }: Props) => {
  const { openDialog, closeDialog } = useContext(DialogContext)
  const { mutate: createLog } = useCreatePackagingLog(closeDialog)

  const restQuantity = subTask.quantity - completedQty
  const pct = subTask.quantity > 0 ? Math.min(100, Math.round((completedQty / subTask.quantity) * 100)) : 0
  const statusCfg = STATUS_CONFIG[subTask.status]

  const handleAddLog = () => {
    if (!subTask.productionOrderItemId) return
    openDialog({
      title: subTask.itemName ?? 'Товар',
      content: (
        <PackingLogForm
          maxQuantity={restQuantity}
          actionSubmit={(values) => {
            createLog({
              packagingTaskId:       packagingTaskId as Id<'packagingTasks'>,
              productionOrderItemId: subTask.productionOrderItemId as Id<'productionOrderItems'>,
              type:     values.type,
              quantity: values.quantity,
              comment:  values.comment,
            })
          }}
        />
      ),
    })
  }

  return (
    <div className="flex flex-col gap-1.5 px-3 py-2 rounded-md border bg-background">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-medium truncate">{subTask.itemName ?? '—'}</p>
            <CustomBadge
              isCustomCut={subTask.isCustomCut}
              isCustomSewing={subTask.isCustomSewing}
              customCutComment={subTask.customCutComment}
              customSewingComment={subTask.customSewingComment}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">{subTask.color} · {subTask.size}</p>
        </div>
        <div className='flex items-center gap-2'>
          <div className="flex flex-col gap-1 text-[11px] items-end text-muted-foreground">
            <div className="flex items-center gap-2 flex-wrap">
              {statusCfg && (
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${statusCfg.className}`}>
                  {statusCfg.label}
                </span>
              )}
              {subTask.assignedTo && (
                <span
                  className="size-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold shrink-0"
                  title={[subTask.assignedTo.name, subTask.assignedTo.lastName].filter(Boolean).join(' ')}
                >
                  {initials(subTask.assignedTo)}
                </span>
              )}
            </div>
            {subTask.endDate && (
              <span className="flex items-center gap-1">
                <CalendarClock size={11} />
                {formatDateTime(subTask.endDate)}
              </span>
            )}
          </div>
          <Button
            size="icon"
            variant="outline"
            className="size-7 shrink-0"
            onClick={handleAddLog}
            disabled={restQuantity <= 0 || !subTask.productionOrderItemId}
          >
            <Plus className="size-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Виконано: <b className="text-foreground">{completedQty}</b> / {subTask.quantity} шт</span>
        {defectQty > 0 && <span className="text-red-500">Брак: {defectQty}</span>}
        <span>{pct}%</span>
      </div>

      <ProgressBar done={completedQty} total={subTask.quantity} />
    </div>
  )
}
