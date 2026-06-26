import { v } from 'convex/values'

const asUnion = <T extends string>(values: readonly [T, T, ...T[]]) =>
  v.union(...values.map(t => v.literal(t)) as [any, any, ...any[]])

// shared by cuttingTasks.status and sewingTasks.status
export const TASK_STATUSES = ['new', 'in_progress', 'done', 'delayed'] as const
export type TaskStatus = typeof TASK_STATUSES[number]
export const taskStatusV = asUnion(TASK_STATUSES)

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
