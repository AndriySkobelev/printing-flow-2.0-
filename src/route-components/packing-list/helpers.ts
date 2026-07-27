import { type PackagingTask, type PackagingSubTask, type PackagingSubcontractorTask } from './types'

export const STATUS_CONFIG: Record<PackagingSubTask['status'], { label: string; className: string }> = {
  new:         { label: 'Нове',      className: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'В роботі', className: 'bg-amber-100 text-amber-700' },
  done:        { label: 'Готово',    className: 'bg-green-100 text-green-700' },
  paused:      { label: 'Пауза',     className: 'bg-gray-100 text-gray-500' },
}

export const SUBCONTRACTOR_TYPE_LABELS: Record<PackagingSubcontractorTask['type'], string> = {
  sublimation: 'Сублімація',
  embroidery:  'Вишивка',
  silkscreen:  'Шовкодрук',
  dtg:         'DTG',
  dtf:         'DTF',
  other:       'Інше',
}

export const formatDate = (ts: number) =>
  new Date(ts).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: '2-digit' })

export const formatDateTime = (ts: number) =>
  new Date(ts).toLocaleString('uk-UA', {
    day:    '2-digit',
    month:  '2-digit',
    year:   '2-digit',
    hour:   '2-digit',
    minute: '2-digit',
  })

export const initials = (assignee: PackagingSubTask['assignedTo']) =>
  [assignee?.name, assignee?.lastName].filter(Boolean).map(w => w![0]).join('').toUpperCase() || '?'

export const completedByItem = (task: PackagingTask, itemId: string) =>
  task.logs.filter(l => l.productionOrderItemId === itemId && l.type === 'completed').reduce((s, l) => s + l.quantity, 0)

export const defectByItem = (task: PackagingTask, itemId: string) =>
  task.logs.filter(l => l.productionOrderItemId === itemId && l.type !== 'completed').reduce((s, l) => s + l.quantity, 0)

export const taskTotals = (task: PackagingTask) => {
  const uniqueItemIds = [...new Set(task.subTasks.map(st => st.productionOrderItemId).filter((id): id is string => id !== null))]
  const totalQty  = task.subTasks.reduce((s, st) => s + st.quantity, 0)
  const totalDone = uniqueItemIds.reduce((s, id) => s + completedByItem(task, id), 0)
  return { totalQty, totalDone }
}

export const isPackagingTaskDone = (task: PackagingTask) => {
  const { totalQty, totalDone } = taskTotals(task)
  return totalQty > 0 && totalDone >= totalQty
}
