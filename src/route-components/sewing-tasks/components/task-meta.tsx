import { type SubTask } from '../types'

export const TaskMeta = ({ task }: { task: SubTask }) => (
  <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
    {task.color && (
      <span className="flex items-center gap-1">
        <span className="size-3 rounded-full border" style={{ background: task.color }} />
        {task.color}
      </span>
    )}
    {task.size && <span>Розмір: <b className="text-foreground">{task.size}</b></span>}
    <span>Кількість: <b className="text-foreground">{task.quantity}</b></span>
  </div>
)
