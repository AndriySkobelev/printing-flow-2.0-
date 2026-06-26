import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

type MyPopoverProps = {
  withArrow?: boolean
  trigger: React.ReactNode
  content: React.ReactNode
  align?: "start" | "center" | "end"
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function MyPopover({
  align = 'end',
  trigger,
  content,
  withArrow = false,
  open,
  onOpenChange,
}: MyPopoverProps) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        {trigger}
      </PopoverTrigger>
      <PopoverContent align={align} className="w-fit" withArrow={withArrow}>
        {content}
      </PopoverContent>
    </Popover>
  )
}
