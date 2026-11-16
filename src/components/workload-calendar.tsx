import { useEffect, useState, useMemo } from 'react'
import { format } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

export type DeptKey = 'cutting' | 'sewing' | 'branding' | 'packaging' | 'subcontractor'

export type WorkloadDay = {
  date: string          // yyyy-mm-dd
  load: Partial<Record<DeptKey, number>>   // %, can exceed 100
  hint?: Partial<Record<DeptKey, string>>
  // Planned minutes against the day's capacity — summed up for the week.
  time?: Partial<Record<DeptKey, { minutes: number; capacity: number }>>
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const DEPTS: { key: DeptKey; label: string; short: string; color: string }[] = [
  { key: 'cutting',       label: 'Розкрій',     short: 'Розкрій',  color: '#3b82f6' },
  { key: 'sewing',        label: 'Пошив',        short: 'Пошив',    color: '#8b5cf6' },
  { key: 'branding',      label: 'Брендування',  short: 'Бренд.',   color: '#f97316' },
  { key: 'packaging',     label: 'Пакування',    short: 'Пакув.',   color: '#10b981' },
  { key: 'subcontractor', label: 'Підрядник',    short: 'Підряд.',  color: '#ec4899' },
]

const DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateStr(d: Date) {
  return format(d, 'yyyy-MM-dd')
}

function getMondayOf(d: Date) {
  const date = new Date(d)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function addDays(d: Date, n: number) {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function loadColor(pct: number) {
  if (pct >= 90) return '#ef4444'
  if (pct >= 70) return '#f97316'
  if (pct >= 40) return '#eab308'
  return '#22c55e'
}

const formatHours = (minutes: number) =>
  `${Number((minutes / 60).toFixed(1)).toLocaleString('uk-UA')} год`

function loadBg(pct: number) {
  if (pct >= 90) return '#fef2f2'
  if (pct >= 70) return '#fff7ed'
  if (pct >= 40) return '#fefce8'
  return '#f0fdf4'
}

// ─── Month View ───────────────────────────────────────────────────────────────

function MonthView({ year, month, data, today, depts }: {
  year: number
  month: number
  data: Map<string, WorkloadDay>
  today: string
  depts: typeof DEPTS
}) {
  const firstDay = new Date(year, month, 1)
  const lastDay  = new Date(year, month + 1, 0)
  const startCell = getMondayOf(firstDay)

  const weeks: Date[][] = []
  let cursor = new Date(startCell)
  while (cursor <= lastDay || weeks.length < 5) {
    const week: Date[] = []
    for (let i = 0; i < 7; i++) {
      week.push(new Date(cursor))
      cursor = addDays(cursor, 1)
    }
    weeks.push(week)
    if (cursor > lastDay && weeks.length >= 4) break
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="grid grid-cols-7 border-b">
        {DAY_NAMES.map(name => (
          <div key={name} className="py-2 text-center text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            {name}
          </div>
        ))}
      </div>

      <div className="flex-1 grid min-h-0" style={{ gridTemplateRows: `repeat(${weeks.length}, 1fr)` }}>
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 min-h-0">
            {week.map((day, di) => {
              const str   = toDateStr(day)
              const isCurrentMonth = day.getMonth() === month
              const isToday = str === today
              const entry = data.get(str)

              return (
                <div
                  key={di}
                  className={cn(
                    'border-r border-b p-1.5 flex flex-col gap-[3px] min-h-0',
                    !isCurrentMonth && 'bg-muted/30',
                    di === 6 && 'border-r-0',
                  )}
                >
                  <span className={cn(
                    'text-xs font-medium self-end leading-none mb-0.5',
                    isToday
                      ? 'size-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[11px]'
                      : !isCurrentMonth
                        ? 'text-muted-foreground/50'
                        : 'text-foreground',
                  )}>
                    {day.getDate()}
                  </span>

                  {entry && isCurrentMonth && depts.map(dept => {
                    const pct = entry.load[dept.key] ?? 0
                    return (
                      <div key={dept.key} className="flex items-center gap-1 min-w-0" title={entry.hint?.[dept.key]}>
                        <span
                          className="text-[10px] shrink-0 w-[38px] truncate"
                          style={{ color: dept.color }}
                        >
                          {dept.short}
                        </span>
                        <div className="flex-1 h-[4px] rounded-full bg-muted/50 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${Math.min(100, pct)}%`, background: loadColor(pct) }}
                          />
                        </div>
                        <span
                          className="text-[10px] font-medium shrink-0 w-[28px] text-right tabular-nums"
                          style={{ color: pct > 0 ? loadColor(pct) : undefined }}
                        >
                          {pct > 0 ? `${pct}%` : ''}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Week View ────────────────────────────────────────────────────────────────

function WeekView({ monday, data, today, depts }: {
  monday: Date
  data: Map<string, WorkloadDay>
  today: string
  depts: typeof DEPTS
}) {
  const days    = Array.from({ length: 7 }, (_, i) => addDays(monday, i))
  const entries = days.map(d => data.get(toDateStr(d)))
  const hasTime = entries.some(e => e?.time)
  const weekTime = (key: DeptKey) => entries.reduce(
    (sum, e) => ({ minutes: sum.minutes + (e?.time?.[key]?.minutes ?? 0), capacity: sum.capacity + (e?.time?.[key]?.capacity ?? 0) }),
    { minutes: 0, capacity: 0 },
  )

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="w-[140px] border border-border bg-muted/30 p-2 text-left text-xs font-medium text-muted-foreground">
              Відділ
            </th>
            {days.map((d, i) => {
              const str = toDateStr(d)
              const isToday = str === today
              return (
                <th
                  key={i}
                  className={cn(
                    'border border-border p-2 text-center text-xs font-medium min-w-[110px]',
                    isToday ? 'bg-primary/5 text-primary' : 'bg-muted/30',
                  )}
                >
                  {DAY_NAMES[i]}
                  <br />
                  <span className="font-normal">
                    {d.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' })}
                  </span>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {depts.map(dept => (
            <tr key={dept.key}>
              <td className="border border-border p-2 bg-muted/10">
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full shrink-0" style={{ background: dept.color }} />
                  <span className="text-xs font-medium text-muted-foreground">{dept.label}</span>
                </div>
                {hasTime && (() => {
                  const { minutes, capacity } = weekTime(dept.key)
                  const pct = capacity > 0 ? Math.round((minutes / capacity) * 100) : minutes > 0 ? 100 : 0
                  return (
                    <div className="mt-1 flex flex-col tabular-nums">
                      <span className="text-sm font-semibold">{formatHours(minutes)}</span>
                      <span className="whitespace-nowrap text-[11px] text-muted-foreground">
                        {`з ${formatHours(capacity)} · `}
                        <span style={{ color: pct > 0 ? loadColor(pct) : undefined }}>{`${pct}%`}</span>
                      </span>
                    </div>
                  )
                })()}
              </td>
              {days.map((d, di) => {
                const str   = toDateStr(d)
                const entry = data.get(str)
                const pct   = entry?.load[dept.key] ?? 0

                return (
                  <td key={di} className="border border-border p-2" title={entry?.hint?.[dept.key]}>
                    <div
                      className="rounded-md p-2 flex flex-col gap-1.5"
                      style={{ background: pct > 0 ? loadBg(pct) : undefined }}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className="text-sm font-semibold"
                          style={{ color: pct > 0 ? loadColor(pct) : undefined }}
                        >
                          {pct > 0 ? `${pct}%` : '—'}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${Math.min(100, pct)}%`, background: loadColor(pct) }}
                        />
                      </div>
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

type View = 'month' | 'week'

type Props = {
  data?: WorkloadDay[]
  depts?: DeptKey[]
  // First and last visible day, yyyy-mm-dd.
  onRangeChange?: (from: string, to: string) => void
  className?: string
}

export function WorkloadCalendar({ data = [], depts: deptKeys, onRangeChange, className }: Props) {
  const [view, setView]       = useState<View>('month')
  const [current, setCurrent] = useState(() => new Date())

  const today  = toDateStr(new Date())
  const monday = getMondayOf(current)
  const depts  = deptKeys ? DEPTS.filter(d => deptKeys.includes(d.key)) : DEPTS

  const rangeStart = view === 'month' ? getMondayOf(new Date(current.getFullYear(), current.getMonth(), 1)) : monday
  const rangeFrom  = toDateStr(rangeStart)
  const rangeTo    = toDateStr(addDays(rangeStart, view === 'month' ? 41 : 6))
  useEffect(() => onRangeChange?.(rangeFrom, rangeTo), [rangeFrom, rangeTo])

  const dataMap = useMemo(
    () => new Map(data.map(d => [d.date, d])),
    [data],
  )

  function navigate(dir: 1 | -1) {
    setCurrent(prev => {
      const d = new Date(prev)
      if (view === 'month') d.setMonth(d.getMonth() + dir)
      else d.setDate(d.getDate() + dir * 7)
      return d
    })
  }

  const title = view === 'month'
    ? current.toLocaleDateString('uk-UA', { month: 'long', year: 'numeric' })
    : (() => {
        const end = addDays(monday, 6)
        const s = monday.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })
        const e = end.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', year: 'numeric' })
        return `${s} – ${e}`
      })()

  return (
    <div className={cn('flex flex-col gap-3', className)}>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center rounded-md border bg-muted/30 p-1 gap-0.5">
          {(['month', 'week'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                'px-3 py-1 rounded text-sm font-medium transition-colors',
                view === v
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {v === 'month' ? 'Місяць' : 'Тиждень'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" onClick={() => navigate(-1)}>
            <ChevronLeft size={16} />
          </Button>
          <span className="text-sm font-medium min-w-[200px] text-center capitalize">
            {title}
          </span>
          <Button variant="ghost" size="icon-sm" onClick={() => navigate(1)}>
            <ChevronRight size={16} />
          </Button>
        </div>

        <Button variant="outline" size="sm" onClick={() => setCurrent(new Date())}>
          Сьогодні
        </Button>

        {/* Legend */}
        <div className="ml-auto flex items-center gap-3 flex-wrap">
          {[
            { label: 'Низьке',    color: '#22c55e' },
            { label: 'Помірне',   color: '#eab308' },
            { label: 'Високе',    color: '#f97316' },
            { label: 'Критичне',  color: '#ef4444' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full" style={{ background: l.color }} />
              <span className="text-xs text-muted-foreground">{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Calendar body */}
      <div className="border rounded-lg bg-background overflow-hidden flex flex-col" style={{ height: 'calc(90vh - 180px)' }}>
        {view === 'month' ? (
          <MonthView
            year={current.getFullYear()}
            month={current.getMonth()}
            data={dataMap}
            today={today}
            depts={depts}
          />
        ) : (
          <WeekView
            monday={monday}
            data={dataMap}
            today={today}
            depts={depts}
          />
        )}
      </div>
    </div>
  )
}
