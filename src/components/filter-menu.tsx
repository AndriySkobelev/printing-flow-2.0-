import { type ReactNode, useMemo, useState } from 'react'
import { ListFilter, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

export type FilterMenuOption<T extends string> = {
  value:   T
  label:   ReactNode
  search?: string   // text matched by the search box; defaults to `value`
}

type Props<T extends string> = {
  label:              string
  options:            FilterMenuOption<T>[]
  selected:           T[]
  onChange:           (selected: T[]) => void
  searchPlaceholder?: string   // shows a search box above the options
  triggerClassName?:  string
}

// Multi-select filter dropdown: a "Label (n)" button with checkable options.
export const FilterMenu = <T extends string>({
  label, options, selected, onChange, searchPlaceholder, triggerClassName,
}: Props<T>) => {
  const [search, setSearch] = useState('')

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? options.filter(o => (o.search ?? o.value).toLowerCase().includes(q)) : options
  }, [options, search])

  const toggle = (value: T) =>
    onChange(selected.includes(value) ? selected.filter(v => v !== value) : [...selected, value])

  return (
    <DropdownMenu onOpenChange={open => { if (!open) setSearch('') }}>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className={cn('h-6 text-[11px] px-2', selected.length > 0 && 'border-primary/60 bg-primary/10', triggerClassName)}
        >
          <ListFilter size={10} className="mr-1" />
          {label}{selected.length > 0 ? ` (${selected.length})` : ''}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {searchPlaceholder && (
          <div className="p-1">
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.stopPropagation()}
              placeholder={searchPlaceholder}
              className="h-7 text-xs"
              autoFocus
            />
          </div>
        )}
        <div className="max-h-56 overflow-y-auto">
          {visible.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">Нічого не знайдено</p>
          )}
          {visible.map(opt => (
            <DropdownMenuCheckboxItem
              key={opt.value}
              checked={selected.includes(opt.value)}
              onSelect={e => e.preventDefault()}
              onCheckedChange={() => toggle(opt.value)}
            >
              {opt.label}
            </DropdownMenuCheckboxItem>
          ))}
        </div>
        {selected.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange([])}
              className="w-full justify-start gap-2 px-2 h-auto py-1.5 text-xs font-normal text-muted-foreground"
            >
              <X size={12} /> Скинути фільтр
            </Button>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
