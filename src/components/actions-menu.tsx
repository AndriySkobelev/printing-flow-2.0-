import { type ReactNode } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export type ActionItem = {
  label: string
  icon: ReactNode
  disabled?: boolean
  onClick: () => void
  destructive?: boolean
}

type ActionsMenuProps = {
  items: ActionItem[]
  trigger?: ReactNode
  align?: 'start' | 'center' | 'end'
}

export const ActionsMenu = ({ items, trigger, align = 'end' }: ActionsMenuProps) => {
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
        {regular.map((item, i) => (
          <DropdownMenuItem key={i} disabled={item.disabled} onClick={item.onClick} className="gap-2 text-xs">
            {item.icon}
            {item.label}
          </DropdownMenuItem>
        ))}
        {destructive.length > 0 && regular.length > 0 && <DropdownMenuSeparator />}
        {destructive.map((item, i) => (
          <DropdownMenuItem key={i} onClick={item.onClick} className="gap-2 text-xs text-destructive focus:text-destructive">
            {item.icon}
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
