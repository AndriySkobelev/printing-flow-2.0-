import { FilePen } from 'lucide-react'
import { type Id } from 'convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { SpecChangesPopover } from '@/components/spec-details'
import { StatusBadge } from './status-badge'
import { TaskImages } from './task-images'
import { TaskMeta } from './task-meta'
import { TaskActions } from './task-actions'
import { CustomNotice } from './custom-notice'
import { ExtraWorks } from './extra-works'
import { formatDate } from '../helpers'
import { type SubTask } from '../types'

export const TaskCard = ({ task }: { task: SubTask }) => {
  const label    = task.orderIndex ?? task.keycrmOrderId ?? '—'
  const deadline = task.endDate ?? task.taskEndDate
  const isDone   = task.status === 'done'

  return (
    <div className="border rounded-lg px-4 py-3 flex flex-col gap-3 bg-background">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          {task.productionOrderItemId ? (
            <SpecChangesPopover
              itemId={task.productionOrderItemId as Id<'productionOrderItems'>}
              productName={task.specName ?? undefined}
              color={task.color ?? undefined}
              trigger={
                <Button
                  type="button"
                  variant="ghost"
                  className="h-auto min-w-0 justify-start gap-1.5 p-0 has-[>svg]:px-0 text-base font-semibold leading-tight hover:bg-transparent hover:text-primary"
                >
                  <span className="truncate underline decoration-dotted underline-offset-4">{task.specName ?? '—'}</span>
                  {task.hasCustomSpec && <FilePen size={14} className="shrink-0 text-violet-500" />}
                </Button>
              }
            />
          ) : (
            <span className="text-base font-semibold leading-tight truncate">{task.specName ?? '—'}</span>
          )}
          <TaskMeta task={task} />
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold">#{label}</span>
            <StatusBadge status={task.status} />
          </div>
          {deadline && (
            <span className="text-xs text-muted-foreground">до {formatDate(deadline)}</span>
          )}
        </div>
      </div>

      {task.isCustomSewing && <CustomNotice comment={task.customSewingComment} />}

      {task.extraWorks && task.extraWorks.length > 0 && <ExtraWorks works={task.extraWorks} />}

      <TaskImages images={task.images} />

      {!isDone && <TaskActions task={task} />}
    </div>
  )
}
