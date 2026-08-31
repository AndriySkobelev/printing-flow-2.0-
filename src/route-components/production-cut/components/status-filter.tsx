import { ListFilter, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

export type StatusFilterOption<S extends string> = {
  key: S
  label: string
  className: string
}

type Props<S extends string> = {
  selected: S[]
  onChange: (selected: S[]) => void
  options: StatusFilterOption<S>[]
}

export const StatusFilter = <S extends string>({ selected, onChange, options }: Props<S>) => {
  const toggle = (key: S) =>
    onChange(selected.includes(key) ? selected.filter(s => s !== key) : [...selected, key])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" className="h-9 text-[11px] px-2">
          <ListFilter size={10} className="mr-1" />
          Статус{selected.length > 0 ? ` (${selected.length})` : ''}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {options.map(opt => (
          <DropdownMenuCheckboxItem
            key={opt.key}
            checked={selected.includes(opt.key)}
            onSelect={e => e.preventDefault()}
            onCheckedChange={() => toggle(opt.key)}
          >
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${opt.className}`}>
              {opt.label}
            </span>
          </DropdownMenuCheckboxItem>
        ))}
        <DropdownMenuSeparator />
        <button
          type="button"
          onClick={() => onChange([])}
          className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent transition-colors"
        >
          <X size={12} /> Скинути фільтр
        </button>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
