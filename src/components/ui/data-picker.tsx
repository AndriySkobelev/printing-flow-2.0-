import * as React from "react"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { format } from "date-fns"
import { uk } from "date-fns/locale"
import { ChevronDownIcon, CalendarDays } from "lucide-react"
import { UTCDate } from "@date-fns/utc"

const representComponents = {
  input: (date: number) => (
    <div className="flex justify-between items-center border h-9.5 rounded-md py-1.25 px-4 text-primary/80 cursor-pointer">
      {date ? format(date, "PPP", { locale: uk  }) : <span className="text-primary/60 text-md">Виберіть дату</span>}
      <ChevronDownIcon size={22} color="#ccc"/>
    </div>
  ),
  iconText: (date: number) => (
    <div className="flex items-center gap-1 text-primary/80 rounded-xl px-2 py-1 cursor-pointer bg-primary/4">
      <div className="flex flex-col items-end text-xs">
        <span className="text-">{date ? format(date, "PPP", { locale: uk  }) : 'Дата не вибрана'}</span>
      </div>
      <CalendarDays size={22} className="text-primary/80" />
    </div>
  )
}

type DatePickerProps = {
  onChange: (date: number) => void
  triggerMode?: 'input' | 'iconText',
  position?: "center" | "start" | "end" | undefined
}

export function DatePicker({ onChange, triggerMode = 'input', position = 'start' }: DatePickerProps) {
  const [date, setDate] = React.useState<Date>(new UTCDate())
  const [open, setOpen] = React.useState<boolean>(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger>
        {representComponents[triggerMode](date as any | number)}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align={position}>
        <Calendar
          mode="single"
          selected={date}
          onSelect={(e) => {
            setDate(e as Date)
            onChange(new Date(e as any).valueOf())
            setOpen(false)
          }}
          defaultMonth={date}
        />
      </PopoverContent>
    </Popover>
  )
}
