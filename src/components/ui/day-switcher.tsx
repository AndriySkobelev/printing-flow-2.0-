import { ChevronLeft, ChevronRight } from 'lucide-react'
import { UTCDate } from '@date-fns/utc'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const DAY_MS = 86_400_000

// Start-of-day (UTC) timestamp for a given ms — used both to normalize
// `value`/`onChange` and to detect "today".
const startOfUTCDay = (ms: number) => {
  const d = new UTCDate(ms)
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

const getTodayDayMs = () => startOfUTCDay(new UTCDate().valueOf())

const formatDay = (dayMs: number) =>
  new UTCDate(dayMs).toLocaleDateString('uk-UA', { weekday: 'short', day: '2-digit', month: 'short' })

type DaySwitcherProps = {
  value: number
  onChange: (dayMs: number) => void
  className?: string
}

const DaySwitcher = ({ value, onChange, className }: DaySwitcherProps) => {
  const today   = getTodayDayMs()
  const isToday = value === today

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Button variant="ghost" size="icon-sm" onClick={() => onChange(value - DAY_MS)}>
        <ChevronLeft size={16} />
      </Button>

      <Button
        variant="ghost"
        onClick={() => onChange(today)}
        disabled={isToday}
        className="h-auto flex-col gap-0 min-w-24 py-1 disabled:opacity-100 disabled:cursor-default"
      >
        <span className={cn('text-sm font-semibold capitalize', isToday && 'text-primary')}>
          {formatDay(value)}
        </span>
        {isToday && <span className="text-[10px] leading-none text-primary">Сьогодні</span>}
      </Button>

      <Button variant="ghost" size="icon-sm" onClick={() => onChange(value + DAY_MS)}>
        <ChevronRight size={16} />
      </Button>
    </div>
  )
}

export { DaySwitcher, getTodayDayMs, startOfUTCDay }
