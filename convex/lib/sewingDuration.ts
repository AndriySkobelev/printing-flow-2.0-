type ExtraWork = { minutesPerUnit: number }

const DEFAULT_MINUTES_PER_UNIT = 3

// Planned sewing time: the spec's norm (3 min/pc when it has none, at least
// 20 min) plus every added extra work's per-unit norm, times the sewer's
// coefficient. Shared by the planner UI and server-side slotting.
export const taskDurationMinutes = (
  qty: number,
  extraWorks: ExtraWork[] | undefined,
  sewingNorm: number | undefined,
  coefficient: number | undefined = 1,
) => Math.round(
  (Math.max(20, qty * (sewingNorm ?? DEFAULT_MINUTES_PER_UNIT))
    + qty * (extraWorks ?? []).reduce((sum, w) => sum + w.minutesPerUnit, 0)) * coefficient,
)

// Workday capacity of one sewer, in minutes.
export const SEWER_DAY_CAPACITY = 480
