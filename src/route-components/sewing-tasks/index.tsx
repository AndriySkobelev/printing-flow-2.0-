import { useContext } from 'react'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from 'convex/_generated/api'
import { type Id } from 'convex/_generated/dataModel'
import { AuthContext } from '@/contexts/auth'
import { Scissors } from 'lucide-react'
import { TaskCard } from './components/task-card'
import { type SubTask } from './types'

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
