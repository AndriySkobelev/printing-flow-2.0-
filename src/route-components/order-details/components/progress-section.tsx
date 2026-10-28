import { memo, useState } from 'react'
import { Scissors, Wand2, Palette, Package, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProgressBar } from '@/components/progress-bar'
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
}

export const ProgressSection = memo(({
  cutDone, cutTotal,
  sewDone, sewTotal,
  brandingDone, brandingTotal,
  packingDone, packingTotal,
  inProduction,
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
        {inProduction && (
          <Button onClick={() => setExpanded(prev => !prev)} size="sm" variant="outline" className="h-6">
            {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
          </Button>
        )}
      </div>

      <ProgressBar done={totalDone} total={totalItems} size="md" />

      {expanded && (
        <div className="flex flex-col gap-2 mt-1">
          <ProgressStat label="Розкрій"     done={cutDone}      total={cutTotal}      icon={<Scissors size={11} />} />
          <ProgressStat label="Пошив"       done={sewDone}      total={sewTotal}      icon={<Wand2    size={11} />} />
          <ProgressStat label="Брендування" done={brandingDone} total={brandingTotal} icon={<Palette  size={11} />} />
          <ProgressStat label="Пакування"   done={packingDone}  total={packingTotal}  icon={<Package  size={11} />} />
        </div>
      )}
    </div>
  )
})
