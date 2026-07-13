import { useMemo, useState } from 'react'
import { ListFilter, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

type Props = {
  colors: string[]
  selected: string[]
  onChange: (colors: string[]) => void
}

export const ColorFilterMenu = ({ colors, selected, onChange }: Props) => {
  const [search, setSearch] = useState('')

  const visibleColors = useMemo(
    () => colors.filter(c => c.toLowerCase().includes(search.trim().toLowerCase())),
    [colors, search]
  )

  const toggle = (color: string) =>
    onChange(selected.includes(color) ? selected.filter(c => c !== color) : [...selected, color])

  return (
    <DropdownMenu onOpenChange={open => { if (!open) setSearch('') }}>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" className="h-6 text-[11px] px-2">
          <ListFilter size={10} className="mr-1" />
          Колір{selected.length > 0 ? ` (${selected.length})` : ''}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <div className="p-1">
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.stopPropagation()}
            placeholder="Пошук кольору..."
            className="h-7 text-xs"
            autoFocus
          />
        </div>
        <div className="max-h-56 overflow-y-auto">
          {visibleColors.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">Нічого не знайдено</p>
          )}
          {visibleColors.map(color => (
            <DropdownMenuCheckboxItem
              key={color}
              checked={selected.includes(color)}
              onSelect={e => e.preventDefault()}
              onCheckedChange={() => toggle(color)}
            >
              {color}
            </DropdownMenuCheckboxItem>
          ))}
        </div>
        {selected.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <button
              type="button"
              onClick={() => onChange([])}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent transition-colors"
            >
              <X size={12} /> Скинути фільтр
            </button>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
