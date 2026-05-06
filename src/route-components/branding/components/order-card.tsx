import { Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { BrandingTask } from '../index'

type Status = 'new' | 'in_progress' | 'done' | 'paused' | 'waiting'

export const STATUS_CONFIG: Record<Status, { label: string; color: string }> = {
  new:         { label: 'Нове',      color: '#378ADD' },
  in_progress: { label: 'В роботі',  color: '#1D9E75' },
  done:        { label: 'Готово',    color: '#639922' },
  paused:      { label: 'Пауза',     color: '#D97706' },
  waiting:     { label: 'Очікує',    color: '#9CA3AF' },
}

export const formatDate = (ts?: number | null) =>
  ts ? new Date(ts).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—'

type ProgressBarProps = {
  completed: number
  total: number
  compact?: boolean
}

const ProgressBar = ({ completed, total, compact }: ProgressBarProps) => {
  const pct = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0
  const fillColor =
    pct === 0   ? 'bg-muted-foreground/30' :
    pct < 40    ? 'bg-amber-400' :
    pct < 80    ? 'bg-yellow-400' :
    pct < 100   ? 'bg-lime-500' :
                  'bg-green-500'

  return (
    <div className="w-full flex flex-col gap-0.5">
      {!compact && (
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>{completed} / {total} шт</span>
          <span>{pct}%</span>
        </div>
      )}
      <div className="w-full h-1.5 bg-primary/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${fillColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

type Props = {
  task: BrandingTask
  isSelected: boolean
  compact?: boolean
  onSelect: (id: string) => void
}

export const OrderCard = ({ task, isSelected, compact = false, onSelect }: Props) => {
  const totalQty = (task.orderItems as { quantity: number }[]).reduce((s, i) => s + (i.quantity ?? 0), 0)
  const completedQty = (task.logs as { type: string; quantity: number }[])
    .filter(l => l.type === 'completed')
    .reduce((s, l) => s + l.quantity, 0)

  return (
    <Button
      variant="ghost"
      onClick={() => onSelect(task._id)}
      className={`w-full h-auto justify-start bg-primary/2 text-left px-2 py-1.5 rounded-lg border flex-col items-start gap-1.5 ${
        isSelected
          ? 'bg-primary/2 border-primary/20 hover:bg-primary/15'
          : 'border-transparent'
      }`}
    >
      {/* Row 1: order id + status */}
      <div className="flex items-center justify-between gap-0.5 w-full">
        <div className="flex gap-2 min-w-0 items-center">
          <p className="text-sm font-medium leading-tight shrink-0">#{task.keycrmOrderId}</p>
          {!compact && task.identifierName && (
            <span className="text-xs text-muted-foreground truncate">{task.identifierName}</span>
          )}
        </div>
      </div>

      {/* Row 2: progress bar */}
      <ProgressBar completed={completedQty} total={totalQty} compact={compact} />

      {/* Row 3: qty + deadline */}
      <div className="flex items-center justify-between w-full">
        {compact
          ? <span className="text-[10px] text-muted-foreground">{completedQty}/{totalQty}</span>
          : <p className="text-xs text-muted-foreground">{totalQty} шт</p>
        }
        <span className="flex gap-1 items-center text-muted-foreground">
          <Truck size={10} />
          <p className="text-xs leading-none">{formatDate(task.endDate)}</p>
        </span>
      </div>

      {compact && task.identifierName && (
        <p className="text-[10px] text-muted-foreground truncate w-full">{task.identifierName}</p>
      )}
    </Button>
  )
}
