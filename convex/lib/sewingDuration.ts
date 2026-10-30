type ExtraWork = { minutesPerUnit: number }

// Planned sewing time: base norm (3 min/pc, at least 20 min) plus every added
// extra work's per-unit norm. Shared by the planner UI and server-side slotting.
export const taskDurationMinutes = (qty: number, extraWorks: ExtraWork[] = []) =>
  Math.max(20, qty * 3) + qty * extraWorks.reduce((sum, w) => sum + w.minutesPerUnit, 0)

// Workday capacity of one sewer, in minutes.
export const SEWER_DAY_CAPACITY = 480
