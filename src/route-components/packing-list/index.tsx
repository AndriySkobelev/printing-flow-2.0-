import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from 'convex/_generated/api'
import { PackageSearch } from 'lucide-react'
import { ExpandableSection } from '@/components/ui/expandable-section'
import { PackTaskCard } from './components/pack-task-card'
import { isPackagingTaskDone } from './helpers'
import { type PackagingTask } from './types'

const PackingListPage = () => {
  const { data: tasks = [], isLoading } = useQuery(
    convexQuery(api.queries.packaging.getAllPackagingTasks, {})
  )

  const active = tasks.filter(t => !isPackagingTaskDone(t as PackagingTask))
  const done   = tasks.filter(t => isPackagingTaskDone(t as PackagingTask))

  return (
    <div className="flex flex-col h-full p-3 gap-4 overflow-y-auto">
      <h1 className="text-base font-semibold shrink-0">Пакування</h1>

      {isLoading && (
        <div className="flex items-center justify-center flex-1">
          <div className="size-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      )}

      {!isLoading && tasks.length === 0 && (
        <div className="flex flex-col items-center justify-center flex-1 gap-2 text-muted-foreground">
          <PackageSearch size={32} strokeWidth={1.5} />
          <p className="text-sm">Немає завдань на пакування</p>
        </div>
      )}

      {active.length > 0 && (
        <section className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Активні ({active.length})
          </p>
          {active.map(t => <PackTaskCard key={t._id} task={t as PackagingTask} />)}
        </section>
      )}

      {done.length > 0 && (
        <ExpandableSection title={`Виконані (${done.length})`}>
          {done.map(t => <PackTaskCard key={t._id} task={t as PackagingTask} />)}
        </ExpandableSection>
      )}
    </div>
  )
}

export default PackingListPage
