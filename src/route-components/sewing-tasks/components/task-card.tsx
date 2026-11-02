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
          <span className="text-base font-semibold leading-tight truncate">{task.specName ?? '—'}</span>
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
