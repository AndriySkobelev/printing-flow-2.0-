import { memo, useState } from 'react'
import { Scissors, Wand2, Palette, Package, PlusIcon, ChevronDown, ChevronUp, CheckCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProgressStat } from './progress-stat'

type Props = {
  cutDone: number
  cutTotal: number
  sewDone: number
  sewTotal: number
  brandingDone: number
  brandingTotal: number
  packingDone: number
  packingTotal: number
  inProduction?: boolean
  onCreateTasks: () => void
  creatingTasks?: boolean
}

export const ProgressSection = memo(({
  cutDone, cutTotal,
  sewDone, sewTotal,
  brandingDone, brandingTotal,
  packingDone, packingTotal,
  inProduction,
  onCreateTasks,
  creatingTasks,
}: Props) => {
  const [expanded, setExpanded] = useState(false)

  const totalDone = cutDone + sewDone + brandingDone + packingDone
  const totalItems = cutTotal + sewTotal + brandingTotal + packingTotal
  const overallPct = totalItems > 0 ? Math.min(100, Math.round((totalDone / totalItems) * 100)) : 0

  return (
    <div className="flex flex-col gap-2 px-3 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Прогрес
          </p>
          <span className="text-[11px] font-semibold tabular-nums text-primary">{overallPct}%</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant={inProduction ? 'secondary' : 'default'}
            onClick={onCreateTasks}
            disabled={creatingTasks || inProduction}
            className="h-6 text-[11px] px-2"
          >
            {creatingTasks || inProduction
              ? <CheckCheck size={10} className="mr-1" />
              : <PlusIcon size={10} className="mr-1" />
            }
            Виробництво
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={() => setExpanded(v => !v)}
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </Button>
        </div>
      </div>

      <div className="w-full h-2 rounded-full bg-border overflow-hidden">
        <div
          className="h-full rounded-full transition-all bg-primary"
          style={{ width: `${overallPct}%` }}
        />
      </div>

      {expanded && (
        <div className="flex flex-col gap-2 mt-1">
          <ProgressStat label="Розкрій"     done={cutDone}      total={cutTotal}      color="#0ea5e9" icon={<Scissors size={11} />} />
          <ProgressStat label="Пошив"       done={sewDone}      total={sewTotal}      color="#8b5cf6" icon={<Wand2    size={11} />} />
          <ProgressStat label="Брендування" done={brandingDone} total={brandingTotal} color="#f59e0b" icon={<Palette  size={11} />} />
          <ProgressStat label="Пакування"   done={packingDone}  total={packingTotal}  color="#10b981" icon={<Package  size={11} />} />
        </div>
      )}
    </div>
  )
})
