import { useContext, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from 'convex/_generated/api'
import { type Id } from 'convex/_generated/dataModel'
import { AuthContext } from '@/contexts/auth'
import { Scissors } from 'lucide-react'
import { ExpandableSection } from '@/components/ui/expandable-section'
import { DaySwitcher, getTodayDayMs, startOfUTCDay } from '@/components/ui/day-switcher'
import { TaskCard } from './components/task-card'
import { type SubTask } from './types'

const SewingTasksPage = () => {
  const { user } = useContext(AuthContext)
  const [selectedDay, setSelectedDay] = useState(getTodayDayMs)

  const { data: tasks = [], isLoading } = useQuery({
    ...convexQuery(api.queries.sewing.getMySubTasks, {
      userId: user?._id as Id<'users'>,
    }),
    enabled: !!user?._id,
  })

  // Only tasks scheduled (startDate set) for the selected day.
  const dayTasks = tasks.filter(t => t.startDate !== undefined && startOfUTCDay(t.startDate) === selectedDay)

  const active = dayTasks.filter(t => t.status !== 'done')
  const done   = dayTasks.filter(t => t.status === 'done')

  return (
    <div className="flex flex-col h-full p-3 gap-4 overflow-y-auto">
      <div className="flex items-center justify-between shrink-0 h-10">
        <h1 className="text-base font-semibold">Мої завдання пошиву</h1>
        <DaySwitcher value={selectedDay} onChange={setSelectedDay} />
      </div>

      {isLoading && (
        <div className="flex items-center justify-center flex-1">
          <div className="size-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      )}

      {!isLoading && dayTasks.length === 0 && (
        <div className="flex flex-col items-center justify-center flex-1 gap-2 text-muted-foreground">
          <Scissors size={32} strokeWidth={1.5} />
          <p className="text-sm">Немає завдань на цей день</p>
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
        <ExpandableSection title={`Виконані (${done.length})`}>
          {done.map(t => <TaskCard key={t._id} task={t as SubTask} />)}
        </ExpandableSection>
      )}
    </div>
  )
}

export default SewingTasksPage
