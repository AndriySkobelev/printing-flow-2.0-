import { Wrench } from 'lucide-react'
import { type SubTask } from '../types'

// Extra work added to the sub-task in the planner, on top of the base sewing.
export const ExtraWorks = ({ works }: { works: NonNullable<SubTask['extraWorks']> }) => (
  <div className="flex items-center gap-1.5 flex-wrap">
    <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
      <Wrench size={12} />
      Додаткова робота:
    </span>
    {works.map(work => (
      <span
        key={work.workId}
        className="px-2 py-0.5 rounded-full text-[11px] font-medium leading-none bg-violet-100 text-violet-700"
      >
        {work.name}
      </span>
    ))}
  </div>
)
