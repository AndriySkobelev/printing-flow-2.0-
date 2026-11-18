import { type Id } from 'convex/_generated/dataModel'
import { Pause } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUpdateSewingSubTaskStatus, useCompleteSewingSubTask } from '../actions'
import { mainAction } from '../helpers'
import { type SubTask } from '../types'

// Pause on the left while the task runs; one main button on the right that
// moves it forward — "В роботу" / "Продовжити", then "Виконати".
export const TaskActions = ({ task }: { task: SubTask }) => {
  const { mutate: changeStatus, isPending: isChanging } = useUpdateSewingSubTaskStatus()
  const { mutate: complete, isPending: isCompleting }   = useCompleteSewingSubTask()

  const id     = task._id as Id<'sewingSubTasks'>
  const action = mainAction[task.status]
  const isBusy = isChanging || isCompleting

  const handleMain = () =>
    action.next === 'done'
      ? complete({ sewingSubTaskId: id })
      : changeStatus({ sewingSubTaskId: id, status: action.next })

  return (
    <div className="flex items-center gap-2 border-t pt-2.5">
      {task.status === 'in_progress' && (
        <Button
          variant="outline"
          size="sm"
          className="h-6 text-[11px] px-2"
          disabled={isBusy}
          onClick={() => changeStatus({ sewingSubTaskId: id, status: 'paused' })}
        >
          <Pause size={11} />
          Пауза
        </Button>
      )}
      <Button
        key={task.status}
        size="sm"
        className="ml-auto h-6 text-[11px] px-2"
        disabled={isBusy}
        onClick={handleMain}
      >
        {action.icon}
        {action.label}
      </Button>
    </div>
  )
}
