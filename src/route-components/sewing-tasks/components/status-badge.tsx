import { STATUS_CONFIG } from '../helpers'
import { type SubTask } from '../types'

export const StatusBadge = ({ status }: { status: SubTask['status'] }) => {
  const cfg = STATUS_CONFIG[status]
  if (!cfg) return null

  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}
