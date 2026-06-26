export const DAY_START = 8
export const DAY_END   = 18
export const DAY_MINS  = (DAY_END - DAY_START) * 60
export const HOUR_PX   = 80
export const MIN_PX    = HOUR_PX / 60
export const SNAP      = 15

export const SEWER_COLORS = [
  '#6366f1', '#ec4899', '#f59e0b', '#10b981',
  '#3b82f6', '#ef4444', '#8b5cf6', '#14b8a6',
] as const

export const DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт'] as const