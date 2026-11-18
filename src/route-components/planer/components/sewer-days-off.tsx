import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { UTCDate } from '@date-fns/utc'
import { format, startOfToday } from 'date-fns'
import { type DateRange } from 'react-day-picker'
import { Loader2, Trash2 } from 'lucide-react'
import { api } from 'convex/_generated/api'
import { type Id } from 'convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { dayKey, dayToMs, DAY_MS } from '../helpers'
import { useCreateSewerDayOff, useDeleteSewerDayOff } from '../actions'

// The calendar works in local days; stored days are UTC midnight.
const toLocalDate = (ms: number) => {
  const d = new UTCDate(ms)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

const fmtDay = (ms: number) => format(new UTCDate(ms), 'dd.MM')
const fmtPeriod = (from: number, to: number) => from === to ? fmtDay(from) : `${fmtDay(from)} – ${fmtDay(to)}`

export const SewerDaysOff = ({ sewerId }: { sewerId: string }) => {
  const userId = sewerId as Id<'users'>
  const [range, setRange] = useState<DateRange | undefined>()
  const [note, setNote]   = useState('')

  const todayMs = dayToMs(dayKey(startOfToday()))
  const { data: periods = [] } = useQuery(convexQuery(api.queries.sewerDaysOff.getSewerDaysOff, {
    userId,
    from: todayMs,
    to:   Number.MAX_SAFE_INTEGER,
  }))
  const { mutate: create, isPending } = useCreateSewerDayOff()
  const { mutate: remove }            = useDeleteSewerDayOff()

  const offDates = useMemo(
    () => periods.flatMap(p => Array.from({ length: (p.to - p.from) / DAY_MS + 1 }, (_, i) => toLocalDate(p.from + i * DAY_MS))),
    [periods],
  )

  const from = range?.from ? dayToMs(dayKey(range.from)) : null
  const to   = range?.to   ? dayToMs(dayKey(range.to))   : from

  const handleAdd = () => {
    if (from == null || to == null) return
    create(
      { userId, from, to, note: note.trim() || undefined },
      { onSuccess: () => { setRange(undefined); setNote('') } },
    )
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      <Calendar
        mode="range"
        selected={range}
        onSelect={setRange}
        disabled={{ before: startOfToday() }}
        modifiers={{ off: offDates }}
        modifiersClassNames={{ off: '[&>button]:bg-red-100 [&>button]:text-red-700' }}
        className="shrink-0 self-center rounded-md border [--cell-size:--spacing(9)] sm:self-start"
      />

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Примітка: відпустка, лікарняний"
          rows={5}
          className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
        <Button type="button" className="h-10 w-full" disabled={from == null || isPending} onClick={handleAdd}>
          {isPending && <Loader2 className="size-4 animate-spin" />}
          <span>{from != null && to != null ? `Додати ${fmtPeriod(from, to)}` : 'Додати'}</span>
        </Button>

        {periods.length > 0 && (
          <div className="flex flex-col gap-1 border-t pt-3">
            {periods.map(p => (
              <div key={p._id} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate">
                  <span className="font-medium tabular-nums">{fmtPeriod(p.from, p.to)}</span>
                  {p.note && <span className="text-muted-foreground">{` · ${p.note}`}</span>}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0 text-red-500 hover:bg-red-50 hover:text-red-600"
                  onClick={() => remove({ id: p._id })}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
