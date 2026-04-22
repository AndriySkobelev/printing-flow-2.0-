import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

type MyPopoverProps = {
  withArrow?: boolean,
  trigger: React.ReactNode;
  content: React.ReactNode;
  align?: "start" | "center" | "end";
}

export function MyPopover({
  align = 'end',
  trigger,
  content,
  withArrow = false,
}: MyPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        {trigger}
      </PopoverTrigger>
      <PopoverContent align={align} className="w-fit" withArrow={withArrow}>
        {content}
      </PopoverContent>
    </Popover>
  )
}
