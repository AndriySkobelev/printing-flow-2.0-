import { useState } from 'react'
import { ArrowLeft, Pencil } from 'lucide-react'
import { useMutation } from 'convex/react'
import { api } from 'convex/_generated/api'
import { type Id } from 'convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MyPopover } from '@/components/my-popover'

// ─── Types ───────────────────────────────────────────────────────────────────

type Tag = { name: string; color: string }

type Props = {
  brandingTaskId: string
  orderId: string
  manager?: string | null
  identifierName?: string | null
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

// ─── DetailHeader ─────────────────────────────────────────────────────────────

export const DetailHeader = ({ brandingTaskId, orderId, manager, identifierName, tags, onBack }: Props) => (
  <div className="shrink-0 border-b">
    {/* Top row */}
    <div className="flex items-center gap-2 px-3 py-2.5">
      <Button variant="ghost" size="icon" onClick={onBack} className="-ml-1 size-8 md:hidden">
        <ArrowLeft />
      </Button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-semibold leading-tight">#{orderId}</p>
          {identifierName && (
            <span className="text-xs text-muted-foreground">· {identifierName}</span>
          )}
          <MyPopover
            align="start"
            trigger={
              <Button variant="ghost" size="icon" className="size-5 text-muted-foreground hover:text-foreground">
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
        {manager && <p className="text-xs text-muted-foreground">{manager}</p>}
      </div>
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
