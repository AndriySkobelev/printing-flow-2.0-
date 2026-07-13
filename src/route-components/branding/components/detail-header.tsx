import { useState } from 'react'
import { ArrowLeft, Pencil, Truck } from 'lucide-react'
import { useMutation } from 'convex/react'
import clsx from 'clsx'
import { api } from 'convex/_generated/api'
import { type Id } from 'convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MyPopover } from '@/components/my-popover'
import { useBrandingGroupsStore } from '../store'

// ─── Types ───────────────────────────────────────────────────────────────────

type Tag = { name: string; color: string }

const formatDate = (ts?: number | null) =>
  ts ? new Date(ts).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—'

type Props = {
  brandingTaskId: string
  orderId: string
  manager?: string | null
  identifierName?: string | null
  endDate?: number | null
  totalQty: number
  completedTotal: number
  tags: Tag[]
  onBack: () => void
}

// ─── IdentifierPopoverContent ─────────────────────────────────────────────────

type IdentifierPopoverProps = {
  brandingTaskId: string
  identifierName?: string | null
}

const IdentifierPopoverContent = ({ brandingTaskId, identifierName }: IdentifierPopoverProps) => {
  const updateTask = useMutation(api.queries.branding.updateBrandingTask)
  const [value, setValue] = useState(identifierName ?? '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateTask({
        brandingTaskId: brandingTaskId as Id<'brandingTasks'>,
        identifierName: value.trim() || undefined,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 w-56 p-1">
      <Input
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="Ідентифікатор"
        className="h-8 text-sm"
        onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
      />
      <Button size="sm" disabled={saving} onClick={handleSave} className="w-full">
        {saving ? 'Збереження…' : 'Зберегти'}
      </Button>
    </div>
  )
}

// ─── AdvancedToggle ───────────────────────────────────────────────────────────

const AdvancedToggle = ({ brandingTaskId }: { brandingTaskId: string }) => {
  const advanced = useBrandingGroupsStore(s => s.advancedByOrder[brandingTaskId] ?? false)
  const setAdvanced = useBrandingGroupsStore(s => s.setAdvanced)

  return (
    <div className="flex items-center rounded-md border p-0.5 text-xs">
      <button
        type="button"
        onClick={() => setAdvanced(brandingTaskId, false)}
        className={clsx('px-2 py-1 rounded-sm transition-colors', !advanced ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}
      >
        Простий
      </button>
      <button
        type="button"
        onClick={() => setAdvanced(brandingTaskId, true)}
        className={clsx('px-2 py-1 rounded-sm transition-colors', advanced ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}
      >
        Розширений
      </button>
    </div>
  )
}

// ─── DetailHeader ─────────────────────────────────────────────────────────────

export const DetailHeader = ({ brandingTaskId, orderId, manager, identifierName, endDate, totalQty, completedTotal, tags, onBack }: Props) => (
  <div className="shrink-0 border-b">
    {/* Top row */}
    <div className="flex items-start gap-2 px-3 py-2.5">
      <div className='flex items-center gap-2 min-w-0 flex-1'>
        <Button variant="ghost" size="icon" onClick={onBack} className="-ml-1 size-8 md:hidden">
          <ArrowLeft />
        </Button>

        {/* Order ID + identifier */}
        <div className="flex flex-col items-start gap-1.5 min-w-0 flex-1">
          <div className='flex items-center gap-1.5 min-w-0 flex-1'>
            <div className='flex items-center gap-1 min-w-0'>
              <p className="text-sm font-semibold leading-tight shrink-0">#{orderId}</p>
              {identifierName && (
                <span className="text-xs text-muted-foreground leading-none truncate">· {identifierName}</span>
              )}
            </div>
            <MyPopover
              align="start"
              trigger={
                <Button variant="ghost" size="icon" className="size-5 shrink-0 text-muted-foreground hover:text-foreground">
                  <Pencil className="size-3" />
                </Button>
              }
              content={
                <IdentifierPopoverContent
                  brandingTaskId={brandingTaskId}
                  identifierName={identifierName}
                />
              }
            />
          </div>
          <div className="flex items-start gap-4 text-xs text-muted-foreground">
            <span>{completedTotal} / {totalQty} </span>
          </div>
        </div>
      </div>

      {/* Right side: manager + shipping date */}
      <div className="flex flex-col justify-end items-end gap-1 shrink-0 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Truck size={11} />
          <b className="text-foreground">{formatDate(endDate)}</b>
        </span>
        {manager && <span className="truncate max-w-[120px]">{manager}</span>}
      </div>
    </div>

    {/* View mode toggle row */}
    <div className="flex items-center justify-end px-3 pb-2">
      <AdvancedToggle brandingTaskId={brandingTaskId} />
    </div>

    {/* Tags row */}
    {tags.length > 0 && (
      <div className="flex flex-wrap gap-1 px-3 pb-2">
        {tags.map((tag, i) => (
          <span
            key={i}
            className="px-2 py-0.5 rounded-full text-[11px] font-medium text-white"
            style={{ backgroundColor: tag.color }}
          >
            {tag.name}
          </span>
        ))}
      </div>
    )}
  </div>
)
