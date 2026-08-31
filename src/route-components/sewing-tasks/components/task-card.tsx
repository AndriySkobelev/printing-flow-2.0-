import { StatusBadge } from './status-badge'
import { TaskImages } from './task-images'
import { TaskMeta } from './task-meta'
import { TaskActions } from './task-actions'
import { CustomNotice } from './custom-notice'
import { type SubTask } from '../types'

export const TaskCard = ({ task }: { task: SubTask }) => {
  const label    = task.orderIndex ?? task.keycrmOrderId ?? '—'
  const deadline = task.endDate ?? task.taskEndDate
  const isDone   = task.status === 'done'

  return (
    <div className="border rounded-lg px-4 py-3 flex flex-col gap-3 bg-background">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-sm font-semibold truncate">#{label}</span>
          {task.specName && (
            <span className="text-xs text-muted-foreground truncate">{task.specName}</span>
          )}
        </div>
        <StatusBadge status={task.status} />
      </div>

      {task.isCustomSewing && <CustomNotice comment={task.customSewingComment} />}

      <TaskMeta task={task} deadline={deadline} />

      <TaskImages images={task.images} />

      {!isDone && <TaskActions task={task} />}
    </div>
  )
}
