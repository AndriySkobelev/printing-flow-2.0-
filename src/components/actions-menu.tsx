import { type ReactNode } from 'react'
import { MoreHorizontal, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export type ActionItem = {
  label: string
  icon: ReactNode
  disabled?: boolean
  onClick?: () => void
  destructive?: boolean
  // Left out of the menu, e.g. when the role may not do it.
  hidden?: boolean
  className?: string
  // Leave the menu open after clicking (for toggles picked several at a time).
  keepOpen?: boolean
  subItems?: ActionItem[]
}

export type ActionGroup = {
  label: string
  items: ActionItem[]
}

type ActionsMenuProps = {
  items?: ActionItem[]
  groups?: ActionGroup[]
  trigger?: ReactNode
  align?: 'start' | 'center' | 'end'
}

const renderItem = (item: ActionItem, i: number) => {
  if (item.subItems?.length) {
    return (
      <DropdownMenuSub key={i}>
        <DropdownMenuSubTrigger className="gap-2 text-xs">
          {item.icon}
          {item.label}
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="w-44">
          {item.subItems.map((sub, j) => (
            <DropdownMenuItem
              key={j}
              disabled={sub.disabled}
              onClick={sub.onClick}
              onSelect={sub.keepOpen ? (e) => e.preventDefault() : undefined}
              className={cn('gap-2 text-xs', sub.className)}
            >
              {sub.icon}
              {sub.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    )
  }

  if (item.destructive) {
    return (
      <DropdownMenuItem key={i} disabled={item.disabled} onClick={item.onClick} className="gap-2 text-xs text-destructive focus:text-destructive">
        {item.icon}
        {item.label}
      </DropdownMenuItem>
    )
  }

  return (
    <DropdownMenuItem
      key={i}
      disabled={item.disabled}
      onClick={item.onClick}
      onSelect={item.keepOpen ? (e) => e.preventDefault() : undefined}
      className={cn('gap-2 text-xs', item.className)}
    >
      {item.icon}
      {item.label}
    </DropdownMenuItem>
  )
}

// Renders nothing when every item is hidden.
export const ActionsMenu = ({ items: allItems = [], groups: allGroups, trigger, align = 'end' }: ActionsMenuProps) => {
  const items       = allItems.filter(i => !i.hidden)
  const groups      = allGroups
    ?.map(g => ({ ...g, items: g.items.filter(i => !i.hidden) }))
    .filter(g => g.items.length > 0)
  const regular     = items.filter(i => !i.destructive)
  const destructive = items.filter(i =>  i.destructive)

  if (items.length === 0 && !groups?.length) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="icon" className="size-5 text-muted-foreground hover:text-foreground">
            <MoreHorizontal className="size-5" />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-44">
        {groups?.map((group, gi) => (
          <div key={gi}>
            {gi > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-muted-foreground px-2 py-1">
              {group.label}
            </DropdownMenuLabel>
            {group.items.map(renderItem)}
          </div>
        ))}
        {!!groups?.length && regular.length > 0 && <DropdownMenuSeparator />}
        {regular.map(renderItem)}
        {destructive.length > 0 && (regular.length > 0 || !!groups?.length) && <DropdownMenuSeparator />}
        {destructive.map(renderItem)}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
