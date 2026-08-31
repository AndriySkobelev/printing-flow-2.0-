import { Sparkles } from 'lucide-react'

export const CustomNotice = ({ comment }: { comment?: string | null }) => (
  <div className="flex items-start gap-1.5 rounded-md border border-violet-300 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30 px-2.5 py-1.5">
    <Sparkles size={13} className="text-violet-500 shrink-0 mt-0.5" />
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-xs font-medium text-violet-700 dark:text-violet-300">Індивідуальний пошив</span>
      {comment && <p className="text-xs text-violet-700/80 dark:text-violet-300/80">{comment}</p>}
    </div>
  </div>
)
