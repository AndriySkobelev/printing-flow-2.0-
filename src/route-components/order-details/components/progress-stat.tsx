import { memo } from 'react'
import { ProgressBar } from '@/components/progress-bar'

export const ProgressStat = memo(({ label, done, total, icon }: {
  label: string
  done: number
  total: number
  icon: React.ReactNode
}) => {
  if (total === 0) return null
  return (
    <div className="flex flex-col gap-1 w-94">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          {icon}
          {label}
        </span>
        <span className="tabular-nums font-medium">{done}/{total}</span>
      </div>
      <ProgressBar done={done} total={total} />
    </div>
  )
})
