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

type ExtraWork = { minutesPerUnit: number }

// Planned sewing time: base norm (3 min/pc, at least 20 min) plus every added
// extra work's per-unit norm.
export const taskDurationMinutes = (qty: number, extraWorks: ExtraWork[] = []) =>
  Math.max(20, qty * 3) + qty * extraWorks.reduce((sum, w) => sum + w.minutesPerUnit, 0)
