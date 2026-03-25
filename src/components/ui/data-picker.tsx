"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { format } from "date-fns"
import { uk } from "date-fns/locale"
import { ChevronDownIcon } from "lucide-react"

export function DatePicker({ onChange }: any) {
  const [date, setDate] = React.useState<Date>()
  const [open, setOpen] = React.useState<boolean>(false)
  console.log("🚀 ~ DatePicker ~ date:", date)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger>
        {/* <Button
          variant="outline"
          data-empty={!date}
          className="w-53 justify-between text-left font-normal data-[empty=true]:text-muted-foreground"
        >
        </Button> */}
        <div className="flex justify-between items-center border rounded-md py-1.25 px-4 text-primary/80 cursor-pointer">
          {date ? format(date, "PPP", { locale: uk  }) : <span className="text-primary/60 text-md">Виберіть дату</span>}
          <ChevronDownIcon size={22} />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(e) => {
            setDate(e)
            onChange(new Date(e as any).valueOf())
            setOpen(false)
          }}
          defaultMonth={date}
        />
      </PopoverContent>
    </Popover>
  )
}
