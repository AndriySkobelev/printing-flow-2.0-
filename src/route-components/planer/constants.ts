export const DAY_START = 8
export const DAY_END   = 18
export const DAY_MINS  = (DAY_END - DAY_START) * 60
export const HOUR_PX   = 80
export const MIN_PX    = HOUR_PX / 60
export const SNAP      = 15

export const SEWERS = [
  { id: 's1', name: 'Оксана', color: '#6366f1', bg: '#eef2ff' },
  { id: 's2', name: 'Марія',  color: '#ec4899', bg: '#fdf2f8' },
  { id: 's3', name: 'Ірина',  color: '#f59e0b', bg: '#fffbeb' },
  { id: 's4', name: 'Наталя', color: '#10b981', bg: '#ecfdf5' },
] as const

export const SEWER_OPTIONS = SEWERS.map(s => ({ value: s.id, label: s.name }))

export const DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт'] as const