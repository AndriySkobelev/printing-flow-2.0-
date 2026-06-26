import { type ReactNode } from 'react'
import { MoreHorizontal, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
            <DropdownMenuItem key={j} disabled={sub.disabled} onClick={sub.onClick} className="gap-2 text-xs">
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
    <DropdownMenuItem key={i} disabled={item.disabled} onClick={item.onClick} className="gap-2 text-xs">
      {item.icon}
      {item.label}
    </DropdownMenuItem>
  )
}

export const ActionsMenu = ({ items = [], groups, trigger, align = 'end' }: ActionsMenuProps) => {
  const regular     = items.filter(i => !i.destructive)
  const destructive = items.filter(i =>  i.destructive)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="icon" className="size-5 text-muted-foreground hover:text-foreground">
            <MoreHorizontal className="size-3" />
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
        {groups && regular.length > 0 && <DropdownMenuSeparator />}
        {regular.map(renderItem)}
        {destructive.length > 0 && (regular.length > 0 || groups) && <DropdownMenuSeparator />}
        {destructive.map(renderItem)}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
