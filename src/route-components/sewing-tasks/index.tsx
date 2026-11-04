import { useContext, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from 'convex/_generated/api'
import { type Id } from 'convex/_generated/dataModel'
import { AuthContext } from '@/contexts/auth'
import { SUPER_ADMIN } from '@/constants/roles'

// Roles that see every sewer's tasks instead of only their own.
const SEES_ALL_TASKS = [SUPER_ADMIN, 'admin']
import { Scissors } from 'lucide-react'
import { ExpandableSection } from '@/components/ui/expandable-section'
import { DaySwitcher, getTodayDayMs, startOfUTCDay } from '@/components/ui/day-switcher'
import { TaskCard } from './components/task-card'
import { type SubTask } from './types'

// Active cards, then the done ones folded away.
const TaskList = ({ tasks }: { tasks: SubTask[] }) => {
  const active = tasks.filter(t => t.status !== 'done')
  const done   = tasks.filter(t => t.status === 'done')

  return (
    <>
      {active.length > 0 && (
        <section className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Активні ({active.length})
          </p>
          {active.map(t => <TaskCard key={t._id} task={t} />)}
        </section>
      )}

      {done.length > 0 && (
        <ExpandableSection title={`Виконані (${done.length})`}>
          {done.map(t => <TaskCard key={t._id} task={t} />)}
        </ExpandableSection>
      )}
    </>
  )
}

type SewerGroup = { key: string; name: string; tasks: SubTask[] }

// super_admin / admin view: the day's tasks of every sewer, one section each;
// tasks on the day without a sewer come last.
const groupBySewer = (tasks: (SubTask & { assignedTo?: string; sewerName: string | null })[]): SewerGroup[] => {
  const groups = new Map<string, SewerGroup>()
  for (const t of tasks) {
    const key = t.assignedTo ?? 'none'
    if (!groups.has(key)) groups.set(key, { key, name: t.sewerName ?? 'Не призначено', tasks: [] })
    groups.get(key)!.tasks.push(t)
  }
  return [...groups.values()].sort((a, b) =>
    a.key === 'none' ? 1 : b.key === 'none' ? -1 : a.name.localeCompare(b.name, 'uk'))
}

const SewingTasksPage = () => {
  const { user } = useContext(AuthContext)
  const [selectedDay, setSelectedDay] = useState(getTodayDayMs)
  const seesAll = SEES_ALL_TASKS.includes(user?.role)

  const { data: myTasks = [], isLoading: isMyLoading } = useQuery({
    ...convexQuery(api.queries.sewing.getMySubTasks, {
      userId: user?._id as Id<'users'>,
    }),
    enabled: !!user?._id && !seesAll,
  })

  const { data: allTasks = [], isLoading: isAllLoading } = useQuery({
    ...convexQuery(api.queries.sewing.getDaySubTasksForAllUsers, { day: selectedDay }),
    enabled: seesAll,
  })

  const isLoading = seesAll ? isAllLoading : isMyLoading

  // Only tasks scheduled (startDate set) for the selected day.
  const dayTasks = seesAll
    ? allTasks
    : myTasks.filter(t => t.startDate !== undefined && startOfUTCDay(t.startDate) === selectedDay)

  return (
    <div className="flex flex-col h-full p-3 gap-4 overflow-y-auto">
      <div className="flex items-center justify-between shrink-0 h-10">
        <h1 className="text-base font-semibold">{seesAll ? 'Завдання пошиву' : 'Мої завдання пошиву'}</h1>
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

      {seesAll
        ? groupBySewer(allTasks as any).map(group => (
            <section key={group.key} className="flex flex-col gap-2 border-t pt-3 first:border-t-0 first:pt-0">
              <h2 className="text-sm font-semibold">{`${group.name} (${group.tasks.length})`}</h2>
              <TaskList tasks={group.tasks} />
            </section>
          ))
        : <TaskList tasks={dayTasks as SubTask[]} />}
    </div>
  )
}

export default SewingTasksPage
