import { type Id } from 'convex/_generated/dataModel'
import { CheckCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUpdateSewingSubTaskStatus, useCompleteSewingSubTask } from '../actions'
import { toggleAction } from '../helpers'
import { type SubTask } from '../types'

export const TaskActions = ({ task }: { task: SubTask }) => {
  const { mutate: changeStatus, isPending: isChanging } = useUpdateSewingSubTaskStatus()
  const { mutate: complete, isPending: isCompleting }   = useCompleteSewingSubTask()

  return (
    <div className="flex items-center gap-2 flex-wrap border-t pt-2.5">
      <Button
        key={task.status}
        variant="outline"
        size="sm"
        className="h-6 text-[11px] px-2"
        disabled={isChanging}
        onClick={() => changeStatus({ sewingSubTaskId: task._id as Id<'sewingSubTasks'>, status: toggleAction[task.status].next })}
      >
        {toggleAction[task.status].icon}
        {toggleAction[task.status].label}
      </Button>
      <Button
        size="sm"
        className="ml-auto h-6 text-[11px] px-2"
        disabled={isCompleting || task.status !== 'in_progress'}
        onClick={() => complete({ sewingSubTaskId: task._id as Id<'sewingSubTasks'> })}
      >
        <CheckCheck size={11} />
        Виконати
      </Button>
    </div>
  )
}
