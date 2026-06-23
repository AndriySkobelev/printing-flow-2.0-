import { useCallback, useContext } from 'react'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from 'convex/_generated/api'
import { type Id } from 'convex/_generated/dataModel'
import { CalendarCheck, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DialogContext } from '@/contexts/dialog'
import { ActionsMenu } from '@/components/actions-menu'
import { useCreateSubcontractorTask, useUpdateSubcontractorTaskActualDates, useDeleteSubcontractorTask, useUpdateSubcontractorTaskStatus } from '../actions'
import { SubcontractorTaskForm } from '../forms/subcontractor-task-form'
import { ActualDatesForm } from '../forms/actual-dates-form'

const formatDate = (ts: number) =>
  new Date(ts).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: '2-digit' })

const statusLabels: Record<string, string> = {
  sent:            'Відправлено',
  in_progress:     'В процесі',
  returned:        'Повернено',
  delayed:         'Затримано',
  waiting_to_sent: 'Очікує відправки',
}

const typeLabels: Record<string, string> = {
  sublimation: 'Сублімація',
  embroidery:  'Вишивка',
  silkscreen:  'Шовкодрук',
  dtg:         'DTG',
  dtf:         'DTF',
  other:       'Інше',
}

const statusColors: Record<string, string> = {
  sent:        'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  returned:    'bg-green-100 text-green-700',
  delayed:     'bg-red-100 text-red-700',
}

type Task = {
  _id: string
  name: string
  type: string
  status: string
  quantity?: number | null
  expectedSentDate: number
  actualSentDate?: number | null
  expectedReturnDate: number
  actualReturnDate?: number | null
  userName?: string | null
  note?: string | null
}

type TaskStatus = 'sent' | 'in_progress' | 'returned' | 'delayed' | 'waiting_to_sent'

type TaskCardProps = {
  task: Task
  onEditDates: (task: Task) => void
  onDelete: (task: Task) => void
  onChangeStatus: (task: Task, status: TaskStatus) => void
}

const statusOptions: { value: TaskStatus; label: string }[] = [
  { value: 'sent',            label: 'Відправлено'       },
  { value: 'waiting_to_sent', label: 'Очікує відправки'  },
  { value: 'in_progress',     label: 'В процесі'         },
  { value: 'returned',        label: 'Повернено'         },
  { value: 'delayed',         label: 'Затримано'         },
]

const taskMenuItems = (
  task: Task,
  onEditDates: (t: Task) => void,
  onDelete: (t: Task) => void,
  onChangeStatus: (t: Task, s: TaskStatus) => void,
) => [
  {
    label: 'Статус',
    icon: <span className={`size-2 rounded-full inline-block ${statusColors[task.status] ? 'bg-primary' : 'bg-muted'}`} />,
    subItems: statusOptions.map(s => ({
      label:    s.label,
      icon:     <span className={`size-2 rounded-full inline-block ${s.value === task.status ? 'bg-primary' : 'bg-muted'}`} />,
      disabled: s.value === task.status,
      onClick:  () => onChangeStatus(task, s.value),
    })),
  },
  {
    label: 'Фактичні дати',
    icon: <CalendarCheck size={12} />,
    onClick: () => onEditDates(task),
  },
  {
    label: 'Видалити',
    icon: <Trash2 size={12} />,
    destructive: true,
    onClick: () => onDelete(task),
  },
]

const SubcontractorTaskCard = ({ task, onEditDates, onDelete, onChangeStatus }: TaskCardProps) => (
  <div className="border rounded-md px-2.5 py-2 flex flex-col gap-1">
    <div className="flex items-center justify-between gap-2">
      <div className="flex gap-2 items-center min-w-0">
        <span className="text-sm font-medium truncate">{task.name}</span>
        <span className="text-xs bg-amber-200 rounded-2xl px-2 items-center">{typeLabels[task.type]}</span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${statusColors[task.status]}`}>
          {statusLabels[task.status]}
        </span>
        <ActionsMenu items={taskMenuItems(task, onEditDates, onDelete, onChangeStatus)} />
      </div>
    </div>

    <div className="flex flex-col gap-0.5 text-[11px] text-muted-foreground">
      <div className="flex items-center gap-1.5">
        <span className="w-14 shrink-0">очікув.</span>
        <span><b>{formatDate(task.expectedSentDate)}</b> — <b>{formatDate(task.expectedReturnDate)}</b></span>
        {task.quantity != null && <span className="ml-auto">{task.quantity} шт</span>}
      </div>
      {(task.actualSentDate || task.actualReturnDate) && (
        <div className="flex items-center gap-1.5">
          <span className="w-14 shrink-0">факт.</span>
          <span>
            <b className="text-foreground">{task.actualSentDate ? formatDate(task.actualSentDate) : '?'}</b>
            {' — '}
            <b className={task.actualReturnDate ? 'text-foreground' : ''}>{task.actualReturnDate ? formatDate(task.actualReturnDate) : '?'}</b>
          </span>
          {task.userName && <span className="ml-auto">{task.userName}</span>}
        </div>
      )}
      {!task.actualSentDate && !task.actualReturnDate && task.userName && (
        <span className="ml-auto text-[11px] text-muted-foreground">{task.userName}</span>
      )}
    </div>

    {task.note && (
      <p className="text-[11px] text-muted-foreground">{task.note}</p>
    )}
  </div>
)

export const SubcontractorSection = ({ productionOrderId }: { productionOrderId: string }) => {
  const { mutateAsync: createTask } = useCreateSubcontractorTask()
  const { openDialog, closeDialog } = useContext(DialogContext)

  const { mutate: updateActualDates } = useUpdateSubcontractorTaskActualDates()
  const { mutate: deleteTask } = useDeleteSubcontractorTask()
  const { mutate: updateStatus } = useUpdateSubcontractorTaskStatus()

  const { data: tasks = [] } = useQuery(
    convexQuery(api.queries.orders.getSubcontractorTasksByOrder, {
      productionOrderId: productionOrderId as Id<'productionOrders'>,
    })
  )

  const handleAdd = useCallback(() => {
    const id = openDialog({
      title:   'Додати завдання',
      content: (
        <SubcontractorTaskForm
          onSubmit={(values) => {
            createTask({
              productionOrderId:  productionOrderId as Id<'productionOrders'>,
              name:               values.name,
              type:               values.type,
              quantity:           values.quantity ? Number(values.quantity) : undefined,
              expectedSentDate:   values.expectedSentDate,
              expectedReturnDate: values.expectedReturnDate,
              status:             values.status,
              note:               values.note || undefined,
            })
            closeDialog(id)
          }}
        />
      ),
    })
  }, [productionOrderId, createTask, openDialog, closeDialog])

  const handleDelete = useCallback((task: Task) => {
    deleteTask({ taskId: task._id as Id<'subcontractorTasks'> })
  }, [deleteTask])

  const handleChangeStatus = useCallback((task: Task, status: TaskStatus) => {
    updateStatus({ taskId: task._id as Id<'subcontractorTasks'>, status })
  }, [updateStatus])

  const handleEditDates = useCallback((task: Task) => {
    const id = openDialog({
      title:   'Фактичні дати',
      content: (
        <ActualDatesForm
          defaultValues={{
            actualSentDate:   task.actualSentDate ?? undefined,
            actualReturnDate: task.actualReturnDate ?? undefined,
          }}
          onSubmit={(values) => {
            updateActualDates({
              taskId:          task._id as Id<'subcontractorTasks'>,
              actualSentDate:  values.actualSentDate,
              actualReturnDate: values.actualReturnDate,
            })
            closeDialog(id)
          }}
        />
      ),
    })
  }, [openDialog, closeDialog, updateActualDates])

  return (
    <div className="flex flex-col gap-2 px-3 py-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Підрядники ({tasks.length})
        </p>
        <Button size="sm" variant="secondary" className="h-6 text-[11px] px-2" onClick={handleAdd}>
          <Plus size={10} className="mr-1" /> Додати Підряд
        </Button>
      </div>

      {tasks.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {tasks.map(task => (
            <SubcontractorTaskCard
              key={task._id}
              task={task as Task}
              onEditDates={handleEditDates}
              onDelete={handleDelete}
              onChangeStatus={handleChangeStatus}
            />
          ))}
        </div>
      )}
    </div>
  )
}
