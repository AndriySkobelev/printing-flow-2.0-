import { v } from 'convex/values'

const asUnion = <T extends string>(values: readonly [T, T, ...T[]]) =>
  v.union(...values.map(t => v.literal(t)) as [any, any, ...any[]])

// base statuses for sewingTasks.status (via taskSewingStatus below)
export const TASK_STATUSES = ['new', 'in_progress', 'done', 'paused'] as const
export type TaskStatus = typeof TASK_STATUSES[number]
export const taskStatusV = asUnion(TASK_STATUSES)
export const taskSewingStatus = asUnion([...TASK_STATUSES, 'distributed'])

// shared by brandingTasks.status and packagingTasks.status
export const EXTENDED_TASK_STATUSES = ['new', 'in_progress', 'done', 'paused', 'waiting'] as const
export type ExtendedTaskStatus = typeof EXTENDED_TASK_STATUSES[number]
export const extendedTaskStatusV = asUnion(EXTENDED_TASK_STATUSES)

// shared by productionOrderItems.destination and sewingSubTasks.destination
export const DESTINATION_TYPES = ['customer', 'warehouse', 'defects'] as const
export type DestinationType = typeof DESTINATION_TYPES[number]
export const destinationTypeV = asUnion(DESTINATION_TYPES)

// shared by productionOrderItems.brandingType and .cuttingBrandingType
export const BRANDING_TYPES = ['dtf', 'dtg', 'flok', 'embroidery', 'sublimation'] as const
export type BrandingType = typeof BRANDING_TYPES[number]
export const brandingTypeV = asUnion(BRANDING_TYPES)

// uuids of KeyCRM custom fields (order.keycrmData.custom_fields) used to default
// productionOrders' editable "Додаткова інформація" fields. TODO: fill in real uuids.
export const KEYCRM_CUSTOM_FIELD_UUIDS = {
  packaging:            'OR_1011',
  printComment:         'OR_1003',
  identifier:           'OR_1010',
  isCuttingPrint:       'OR_1006',
  isCuttingEmbroidery:  'OR_1007',
} as const
