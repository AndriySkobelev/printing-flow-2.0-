import { formatDate } from '../helpers'
import { type SubTask } from '../types'

export const TaskMeta = ({ task, deadline }: { task: SubTask; deadline: number | null }) => (
  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
    {task.color && (
      <span className="flex items-center gap-1">
        <span className="size-2.5 rounded-full border" style={{ background: task.color }} />
        {task.color}
      </span>
    )}
    {task.size && <span>Розмір: <b className="text-foreground">{task.size}</b></span>}
    <span>Кількість: <b className="text-foreground">{task.quantity}</b></span>
    {deadline && <span>до <b className="text-foreground">{formatDate(deadline)}</b></span>}
  </div>
)
