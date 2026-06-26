import { cn } from '@/lib/utils'

type Props = {
  done: number
  total: number
  size?: 'sm' | 'md'  // sm = h-1.5 (default), md = h-2
  color?: string       // tailwind bg class override, e.g. 'bg-sky-500'
  hex?: string         // dynamic hex color override, e.g. '#0ea5e9'
  className?: string
}

const thresholdColor = (pct: number) =>
  pct === 0  ? 'bg-muted-foreground/20' :
  pct < 30   ? 'bg-red-400'   :
  pct < 50   ? 'bg-amber-400' :
  pct < 70   ? 'bg-yellow-400':
  pct < 100  ? 'bg-lime-500'  :
               'bg-green-500'

export const ProgressBar = ({ done, total, size = 'sm', color, hex, className }: Props) => {
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0
  const fillClass = color ?? (hex ? undefined : thresholdColor(pct))

  return (
    <div className={cn('w-full rounded-full bg-border overflow-hidden', size === 'sm' ? 'h-1.5' : 'h-2', className)}>
      <div
        className={cn('h-full rounded-full transition-all', fillClass)}
        style={{ width: `${pct}%`, ...(hex ? { backgroundColor: hex } : {}) }}
      />
    </div>
  )
}
