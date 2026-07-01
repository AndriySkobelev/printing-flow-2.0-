import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from 'convex/_generated/api'
import { type Id } from 'convex/_generated/dataModel'
import { Palette, Ruler, Plus, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAddMaterialColors, useAddMaterialSizes, useRenameMaterialColor, useRenameMaterialSize } from '../queries'

type Props = {
  materialId: Id<'materials'>
}

const UA_COLOR_MAP: Record<string, string> = {
  'чорний': '#1a1a1a', 'білий': '#f0f0f0', 'синій': '#3b82f6',
  'червоний': '#ef4444', 'зелений': '#22c55e', 'жовтий': '#eab308',
  'помаранчевий': '#f97316', 'фіолетовий': '#a855f7', 'рожевий': '#ec4899',
  'коричневий': '#92400e', 'сірий': '#6b7280', 'бежевий': '#d4b896',
  'золотий': '#ca8a04', 'срібний': '#9ca3af', 'бордовий': '#9f1239',
  'хакі': '#65a30d', 'navy': '#1e3a5f', 'блакитний': '#38bdf8',
}

const colorDot = (name: string) => {
  const hex = UA_COLOR_MAP[name.toLowerCase()]
  return (
    <span
      className="size-3 rounded-full shrink-0 border border-black/10"
      style={{ background: hex ?? '#9ca3af' }}
    />
  )
}

const abbrev = (skuPrefix: string) =>
  skuPrefix.slice(0, 3).toUpperCase()

const EditableChip = ({
  label,
  onRename,
  prefix,
}: {
  label: string
  onRename: (newValue: string) => void
  prefix?: React.ReactNode
}) => {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(label)

  const commit = () => {
    const trimmed = value.trim()
    if (trimmed && trimmed !== label) onRename(trimmed)
    else setValue(label)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          autoFocus
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setValue(label); setEditing(false) } }}
          onBlur={commit}
          className="h-7 w-28 text-xs"
        />
      </div>
    )
  }

  return (
    <div className="group flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs">
      {prefix}
      <span>{label}</span>
      <button
        onClick={() => setEditing(true)}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
      >
        <Pencil size={10} />
      </button>
    </div>
  )
}

const AddChip = ({ onAdd, placeholder }: { onAdd: (v: string) => void; placeholder: string }) => {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')

  const commit = () => {
    const trimmed = value.trim()
    if (trimmed) { onAdd(trimmed); setValue('') }
    setOpen(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-dashed text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
      >
        <Plus size={10} /> {placeholder}
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        autoFocus
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setOpen(false) }}
        className="h-7 w-28 text-xs"
        placeholder={placeholder}
      />
      <Button size="icon" className="size-7" onClick={commit}><Plus size={12} /></Button>
    </div>
  )
}

export const MaterialDetail = ({ materialId }: Props) => {
  const { data, isLoading } = useQuery(
    convexQuery(api.queries.materials.getMaterialWithVariants, { id: materialId })
  )
  const { mutate: addColors } = useAddMaterialColors()
  const { mutate: addSizes } = useAddMaterialSizes()
  const { mutate: renameColor } = useRenameMaterialColor()
  const { mutate: renameSize } = useRenameMaterialSize()

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="size-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!data) return null

  const colors = data.colors ?? []
  const sizes = data.sizes ?? []
  const colorsCount = colors.length
  const sizesCount = sizes.length || 1

  const groupedVariants = colors.map(color => ({
    color,
    variants: data.variants.filter(v => v.color === color),
  }))

  return (
    <div className="flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="size-11 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-primary tracking-wide">{abbrev(data.skuPrefix)}</span>
        </div>
        <div className="flex flex-col">
          <p className="text-base font-semibold leading-tight">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            {[data.material, data.category].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>

      {/* Colors */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Palette size={13} />
          <span className="text-xs">Кольори</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {colors.map(color => (
            <EditableChip
              key={color}
              label={color}
              prefix={colorDot(color)}
              onRename={newColor => renameColor({ id: materialId, oldColor: color, newColor })}
            />
          ))}
          <AddChip
            placeholder="Додати колір"
            onAdd={color => addColors({ id: materialId, colors: [color] })}
          />
        </div>
      </div>

      {/* Sizes */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Ruler size={13} />
          <span className="text-xs">Розміри</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {sizes.map(size => (
            <EditableChip
              key={size}
              label={size}
              onRename={newSize => renameSize({ id: materialId, oldSize: size, newSize })}
            />
          ))}
          <AddChip
            placeholder="Додати"
            onAdd={size => addSizes({ id: materialId, sizes: [size] })}
          />
        </div>
      </div>

      {/* Variants */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Варіанти · {colorsCount} × {sizesCount} = {data.variants.length}, згенеровано автоматично
          </span>
        </div>

        <ScrollArea className="rounded-lg border max-h-72">
          {groupedVariants.map(({ color, variants }, gi) => (
            <div key={color}>
              <div className={`flex items-center gap-2 px-3 py-2 bg-muted/40 ${gi > 0 ? 'border-t' : ''}`}>
                {colorDot(color)}
                <span className="text-sm font-medium">{color}</span>
              </div>
              {variants.map((v) => (
                <div key={v._id} className="flex items-center justify-between px-3 py-2 border-t">
                  <span className="text-sm pl-5">{v.size || '—'}</span>
                  <span className="text-xs text-muted-foreground font-mono">{v.sku}</span>
                </div>
              ))}
            </div>
          ))}
        </ScrollArea>
      </div>
    </div>
  )
}
