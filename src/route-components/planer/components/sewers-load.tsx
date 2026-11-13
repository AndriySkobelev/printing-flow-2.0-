import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { UTCDate } from '@date-fns/utc'
import { addDays, format } from 'date-fns'
import { ChevronLeft, ChevronRight, CalendarOff } from 'lucide-react'
import { api } from 'convex/_generated/api'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { SEWER_COLORS, DAY_NAMES } from '../constants'
import { fmtDur, taskDurationMinutes, dayKey, weekDays, msToDay, loadTone, SEWER_DAY_CAPACITY } from '../helpers'
import { useDaysOffByDay } from '../queries'

// Every sewer's planned load for today and each day of the current week —
// same numbers as the kanban (minutes of sub-tasks put on the sewer's day).
export const SewersLoad = () => {
  const { data: sewerData = [] } = useQuery(convexQuery(api.queries.sewing.getSewerUsers, {}))
  const { data: subTasks  = [] } = useQuery(convexQuery(api.queries.sewing.getPlannerSubTasks, {}))

  const [anchor, setAnchor] = useState(() => new UTCDate())
  const days        = useMemo(() => weekDays(anchor), [anchor])
  const today       = dayKey(new UTCDate())
  const isThisWeek  = dayKey(days[0]) === dayKey(weekDays(new UTCDate())[0])
  const daysOff     = useDaysOffByDay(days)

  // sewerId → day → minutes
  const load = useMemo(() => {
    const coefficients = new Map(sewerData.map(u => [String(u._id), u.coefficient]))
    const map = new Map<string, Map<string, number>>()
    for (const st of subTasks) {
      if (!st.sewerId || st.startDateMs == null) continue
      const sewerId = String(st.sewerId)
      const day     = msToDay(st.startDateMs)
      const byDay   = map.get(sewerId) ?? new Map<string, number>()
      byDay.set(day, (byDay.get(day) ?? 0) + taskDurationMinutes(st.quantity, st.extraWorks, st.sewingNorm, coefficients.get(sewerId)))
      map.set(sewerId, byDay)
    }
    return map
  }, [subTasks, sewerData])

  return (
    <div className="flex flex-col gap-2 px-3 py-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {`Швачки (${sewerData.length})`}
        </p>
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon-sm" className="size-6" onClick={() => setAnchor(d => addDays(d, -7))}>
            <ChevronLeft size={14} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn('h-6 px-1.5 text-[10px] tabular-nums', isThisWeek ? 'text-muted-foreground' : 'text-primary font-semibold')}
            title={isThisWeek ? undefined : 'Повернутись до поточного тижня'}
            disabled={isThisWeek}
            onClick={() => setAnchor(new UTCDate())}
          >
            {`${format(days[0], 'dd.MM')} – ${format(days[4], 'dd.MM')}`}
          </Button>
          <Button variant="ghost" size="icon-sm" className="size-6" onClick={() => setAnchor(d => addDays(d, 7))}>
            <ChevronRight size={14} />
          </Button>
        </div>
      </div>

      {sewerData.length === 0 && <p className="text-xs text-muted-foreground">Немає швачок</p>}

      {sewerData.map((u, i) => {
        const name     = `${u.name} ${u.lastName}`.trim() || '—'
        const byDay    = load.get(String(u._id))
        const usedOn   = (key: string) => byDay?.get(key) ?? 0
        const todayUse = usedOn(today)
        const todayPct = Math.round((todayUse / SEWER_DAY_CAPACITY) * 100)
        const offDays  = daysOff.get(String(u._id))

        return (
          <div key={u._id} className="flex flex-col gap-1.5 border rounded-md px-2.5 py-2">
            <div className="flex items-center gap-2">
              <span
                className="size-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                style={{ background: SEWER_COLORS[i % SEWER_COLORS.length] }}
              >
                {name[0]}
              </span>
              <span className="text-xs font-medium truncate flex-1">{name}</span>
              <span className="text-[11px] tabular-nums shrink-0">
                <span className="text-muted-foreground">Сьогодні </span>
                {offDays?.has(today) ? (
                  <span className="font-semibold text-red-500">вихідний</span>
                ) : (
                  <span className={cn('font-semibold', loadTone(todayPct).text)}>
                    {todayUse > SEWER_DAY_CAPACITY
                      ? `+${fmtDur(todayUse - SEWER_DAY_CAPACITY)}`
                      : `вільно ${fmtDur(SEWER_DAY_CAPACITY - todayUse)}`}
                  </span>
                )}
              </span>
            </div>

            <div className="grid grid-cols-5 gap-1">
              {days.map((d, di) => {
                const key  = dayKey(d)
                const used = usedOn(key)
                const pct  = Math.round((used / SEWER_DAY_CAPACITY) * 100)
                const tone = loadTone(pct)
                const off  = offDays?.get(key)
                return (
                  <div
                    key={key}
                    title={off
                      ? `${DAY_NAMES[di]} ${format(d, 'dd.MM')}: вихідний${off.note ? ` (${off.note})` : ''}${used > 0 ? `, заплановано ${fmtDur(used)}` : ''}`
                      : `${DAY_NAMES[di]} ${format(d, 'dd.MM')}: ${fmtDur(used)} з ${fmtDur(SEWER_DAY_CAPACITY)}`}
                    className={cn(
                      'flex flex-col gap-0.5 rounded px-1 py-0.5',
                      key === today ? 'bg-primary/10 ring-1 ring-primary/40' : key < today && 'opacity-50',
                      off && 'bg-muted',
                    )}
                  >
                    <div className="flex items-baseline justify-between text-[10px] tabular-nums leading-none">
                      <span className="text-muted-foreground">{DAY_NAMES[di]}</span>
                      {off
                        ? <CalendarOff size={10} className={used > 0 ? 'text-red-500' : 'text-muted-foreground'} />
                        : <span className={cn('font-semibold', used > 0 ? tone.text : 'text-muted-foreground')}>{`${pct}%`}</span>}
                    </div>
                    <div className="h-1 rounded-full bg-muted overflow-hidden">
                      <div className={cn('h-full rounded-full', off ? 'bg-red-500' : tone.bar)} style={{ width: `${off ? (used > 0 ? 100 : 0) : Math.min(100, pct)}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
