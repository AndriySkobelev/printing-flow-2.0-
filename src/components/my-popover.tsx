import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

type MyPopoverProps = {
  trigger: React.ReactNode;
  content: React.ReactNode;
  align?: "start" | "center" | "end";
}

export function MyPopover({
  align = 'end',
  trigger,
  content,
}: MyPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        {trigger}
      </PopoverTrigger>
      <PopoverContent align={align} className="w-fit">
        {content}
      </PopoverContent>
    </Popover>
  )
}
