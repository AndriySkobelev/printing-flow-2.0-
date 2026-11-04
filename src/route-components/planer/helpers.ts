import { UTCDate } from '@date-fns/utc'
import { addDays as addDaysFns, startOfWeek, format } from 'date-fns'
import { SNAP } from './constants'

export function snap15(m: number) {
  return Math.round(m / SNAP) * SNAP
}

export function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10)
}

export function addDays(d: Date, n: number) {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

export function getMondayOf(d: Date) {
  const day = d.getDay()
  return addDays(d, day === 0 ? -6 : 1 - day)
}

export function fmtTime(h: number, m: number) {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function fmtDur(mins: number) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}г${m > 0 ? ' ' + m + 'хв' : ''}` : `${m}хв`
}

// Whole calendar days from `from` (today by default) to the given timestamp —
// negative once it's past.
export const daysUntil = (ts?: number | null, from?: number) => {
  if (!ts) return null
  const end    = new UTCDate(ts)
  const start  = from != null ? new UTCDate(from) : new UTCDate()
  const endDay = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate())
  const day    = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())
  return Math.round((endDay - day) / 86_400_000)
}

// Deadline highlight: red once past, amber within 2 days.
export const endDateColor = (ts?: number | null, from?: number) => {
  const days = daysUntil(ts, from)
  if (days === null) return 'text-muted-foreground'
  if (days < 0)  return 'text-red-500 font-semibold'
  if (days <= 2) return 'text-amber-500 font-semibold'
  return 'text-muted-foreground'
}

export { taskDurationMinutes, SEWER_DAY_CAPACITY } from 'convex/lib/sewingDuration'

// ─── Planner week ────────────────────────────────────────────────────────────

export const dayKey = (d: Date) => format(d, 'yyyy-MM-dd')

// Mon–Fri of the week containing `anchor`.
export const weekDays = (anchor: Date) => {
  const monday = startOfWeek(anchor, { weekStartsOn: 1 })
  return Array.from({ length: 5 }, (_, i) => addDaysFns(monday, i))
}

// UTC-midnight ms, as stored in sub-task startDate → yyyy-MM-dd.
export const msToDay = (ms: number) => dayKey(new UTCDate(ms))

// Load colour by percent of capacity: red over 100, amber over 80.
export const loadTone = (pct: number) => ({
  text: pct > 100 ? 'text-red-500' : pct > 80 ? 'text-amber-500' : 'text-emerald-600',
  bar:  pct > 100 ? 'bg-red-500'   : pct > 80 ? 'bg-amber-400'   : 'bg-emerald-500',
})
