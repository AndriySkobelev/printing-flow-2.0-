import { useContext } from 'react'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from 'convex/_generated/api'
import { type Id } from 'convex/_generated/dataModel'
import { AuthContext } from '@/contexts/auth'
import { CheckCheck, Scissors } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUpdateSewingSubTaskStatus, useCompleteSewingSubTask } from './actions'

// ─── Types ────────────────────────────────────────────────────────────────────

type SubTask = {
  _id: string
  quantity: number
  completedQty?: number
  size?: string
  status: 'new' | 'in_progress' | 'done' | 'paused'
  startDate?: number
  endDate?: number
  keycrmOrderId: string | null
  orderIndex: string | null
  specName: string | null
  color: string | null
  taskEndDate: number | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  new:         { label: 'Нове',      className: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'В роботі', className: 'bg-amber-100 text-amber-700' },
  done:        { label: 'Готово',    className: 'bg-green-100 text-green-700' },
  paused:      { label: 'Пауза',     className: 'bg-gray-100 text-gray-500' },
}

const STATUS_OPTIONS = ['new', 'in_progress', 'paused'] as const

const formatDate = (ts: number) =>
  new Date(ts).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: '2-digit' })

// ─── TaskCard ─────────────────────────────────────────────────────────────────

const TaskCard = ({ task }: { task: SubTask }) => {
  const label    = task.orderIndex ?? task.keycrmOrderId ?? '—'
  const deadline = task.endDate ?? task.taskEndDate
  const cfg      = STATUS_CONFIG[task.status]
  const isDone   = task.status === 'done'

  const { mutate: changeStatus, isPending: isChanging } = useUpdateSewingSubTaskStatus()
  const { mutate: complete, isPending: isCompleting }   = useCompleteSewingSubTask()

  return (
    <div className="border rounded-lg px-4 py-3 flex flex-col gap-3 bg-background">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-sm font-semibold truncate">#{label}</span>
          {task.specName && (
            <span className="text-xs text-muted-foreground truncate">{task.specName}</span>
          )}
        </div>
        {cfg && (
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${cfg.className}`}>
            {cfg.label}
          </span>
        )}
      </div>

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

      {!isDone && (
        <div className="flex items-center gap-2 flex-wrap border-t pt-2.5">
          {STATUS_OPTIONS.map(s => (
            <button
              key={s}
              type="button"
              disabled={isChanging || task.status === s}
              onClick={() => changeStatus({ sewingSubTaskId: task._id as Id<'sewingSubTasks'>, status: s })}
              className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors disabled:opacity-50 ${
                task.status === s
                  ? `${STATUS_CONFIG[s].className} border-transparent`
                  : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground'
              }`}
            >
              {STATUS_CONFIG[s].label}
            </button>
          ))}
          <Button
            size="sm"
            className="ml-auto h-6 text-[11px] px-2"
            disabled={isCompleting}
            onClick={() => complete({ sewingSubTaskId: task._id as Id<'sewingSubTasks'> })}
          >
            <CheckCheck size={11} />
            Виконати
          </Button>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const SewingTasksPage = () => {
  const { user } = useContext(AuthContext)

  const { data: tasks = [], isLoading } = useQuery({
    ...convexQuery(api.queries.sewing.getMySubTasks, {
      userId: user?._id as Id<'users'>,
    }),
    enabled: !!user?._id,
  })

  const active = tasks.filter(t => t.status !== 'done')
  const done   = tasks.filter(t => t.status === 'done')

  return (
    <div className="flex flex-col h-full p-3 gap-4 overflow-y-auto">
      <h1 className="text-base font-semibold shrink-0">Мої завдання пошиву</h1>

      {isLoading && (
        <div className="flex items-center justify-center flex-1">
          <div className="size-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      )}

      {!isLoading && tasks.length === 0 && (
        <div className="flex flex-col items-center justify-center flex-1 gap-2 text-muted-foreground">
          <Scissors size={32} strokeWidth={1.5} />
          <p className="text-sm">Немає призначених завдань</p>
        </div>
      )}

      {active.length > 0 && (
        <section className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Активні ({active.length})
          </p>
          {active.map(t => <TaskCard key={t._id} task={t as SubTask} />)}
        </section>
      )}

      {done.length > 0 && (
        <section className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Виконані ({done.length})
          </p>
          {done.map(t => <TaskCard key={t._id} task={t as SubTask} />)}
        </section>
      )}
    </div>
  )
}

export default SewingTasksPage
