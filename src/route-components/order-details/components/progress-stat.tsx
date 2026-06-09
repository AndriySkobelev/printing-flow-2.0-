import { memo } from 'react'

export const ProgressStat = memo(({ label, done, total, color, icon }: {
  label: string
  done: number
  total: number
  color: string
  icon: React.ReactNode
}) => {
  if (total === 0) return null
  const pct = Math.min(100, Math.round((done / total) * 100))
  return (
    <div className="flex flex-col gap-1 w-94">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          {icon}
          {label}
        </span>
        <span className="tabular-nums font-medium">{done}/{total}</span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-border overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  )
})
