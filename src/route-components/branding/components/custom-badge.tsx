import { Sparkles } from 'lucide-react'
import { MyPopover } from '@/components/my-popover'

type Props = {
  isCustomCut?: boolean
  isCustomSewing?: boolean
  customCutComment?: string
  customSewingComment?: string
}

export const CustomBadge = ({ isCustomCut, isCustomSewing, customCutComment, customSewingComment }: Props) => {
  if (!isCustomCut && !isCustomSewing) return null

  return (
    <MyPopover
      align="start"
      trigger={
        <button type="button" className="shrink-0 text-violet-500 hover:opacity-70 transition-opacity">
          <Sparkles size={16} />
        </button>
      }
      content={
        <div className="flex flex-col gap-2 p-3 w-56">
          {isCustomCut && (
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Крій</span>
              <span className="text-xs font-medium text-primary">Індивідуальний</span>
              {customCutComment && <p className="text-xs text-muted-foreground">{customCutComment}</p>}
            </div>
          )}
          {isCustomSewing && (
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Пошив</span>
              <span className="text-xs font-medium text-primary">Індивідуальний</span>
              {customSewingComment && <p className="text-xs text-muted-foreground">{customSewingComment}</p>}
            </div>
          )}
        </div>
      }
    />
  )
}
