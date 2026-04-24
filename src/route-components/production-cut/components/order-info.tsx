import { UserIcon } from 'lucide-react'

type Props = {
  manager: string
}

export function OrderInfo({ manager }: Props) {
  return (
    <div className="flex items-center gap-2 min-w-[160px]">
      <UserIcon size={13} className="text-muted-foreground shrink-0" />
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">Менеджер</span>
        <span className="text-sm font-medium">{manager}</span>
      </div>
    </div>
  )
}
