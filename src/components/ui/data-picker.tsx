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
  console.log("🚀 ~ DatePicker ~ date:", date)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          data-empty={!date}
          className="w-53 justify-between text-left font-normal data-[empty=true]:text-muted-foreground"
        >
          {date ? format(date, "PPP", { locale: uk  }) : <span>Виберіть дату</span>}
          <ChevronDownIcon />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(e) => {
            console.log("🚀 ~ DatePicker ~ e:", e)
            setDate(e)
            onChange(new Date(e as any).valueOf())
          }}
          defaultMonth={date}
        />
      </PopoverContent>
    </Popover>
  )
}
