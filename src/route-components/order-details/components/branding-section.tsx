import { memo } from 'react'
import { cn } from '@/lib/utils'
import { type BrandingTypeValue, BRANDING_TYPES, BRANDING_LABELS } from '../types'

export const BrandingSection = memo(({ label, active, onToggle }: {
  label: string
  active: BrandingTypeValue[]
  onToggle: (type: BrandingTypeValue) => void
}) => (
  <div className="flex flex-col gap-1.5">
    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
    <div className="flex flex-wrap gap-1">
      {BRANDING_TYPES.map(type => (
        <button
          key={type}
          type='button'
          onClick={() => onToggle(type)}
          className={cn(
            'px-2 py-0.5 rounded-full text-[11px] font-medium border transition-colors',
            active.includes(type)
              ? 'bg-primary text-primary-foreground border-primary'
              : 'border-border text-muted-foreground hover:bg-muted'
          )}
        >
          {BRANDING_LABELS[type]}
        </button>
      ))}
    </div>
  </div>
))
