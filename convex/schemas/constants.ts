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

// shared by productionOrders.status
export const PRODUCTION_ORDER_STATUSES = ['new', 'on_production', 'in_progress', 'dispatched', 'done', 'cancelled'] as const
export type ProductionOrderStatus = typeof PRODUCTION_ORDER_STATUSES[number]
export const productionOrderStatusV = asUnion(PRODUCTION_ORDER_STATUSES)

// uuids of KeyCRM custom fields (order.keycrmData.custom_fields) used to default
// productionOrders' editable "Додаткова інформація" fields. TODO: fill in real uuids.
export const KEYCRM_CUSTOM_FIELD_UUIDS = {
  packaging:            'OR_1011',
  printComment:         'OR_1003',
  identifier:           'OR_1010',
  isCuttingPrint:       'OR_1006',
  isCuttingEmbroidery:  'OR_1007',
} as const

// KeyCRM select custom fields whose selected option encodes a productionOrderItem
// SKU prefix in brackets, e.g. "Свідшот (без начосу) [ВСПБ]" -> skuPrefix "ВСПБ".
// A productionOrderItem whose own SKU prefix appears there gets the matching
// brandingType (or cuttingBrandingType, for the "на кроях" fields) set.
export const BRANDING_TYPE_FIELD_MAPPINGS = [
  { uuid: 'OR_1014', brandingType: 'dtf',        isCutting: false },
  { uuid: 'OR_1016', brandingType: 'dtf',        isCutting: true  },
  { uuid: 'OR_1017', brandingType: 'embroidery', isCutting: false },
  { uuid: 'OR_1018', brandingType: 'embroidery', isCutting: true  },
] as const satisfies ReadonlyArray<{ uuid: string; brandingType: BrandingType; isCutting: boolean }>

// Extracts the last bracketed value from a KeyCRM select option, e.g.
// "Свідшот (без начосу) [ВСПБ]" -> "ВСПБ".
export function extractSkuPrefixFromCustomFieldValue(value: string): string | null {
  const matches = [...value.matchAll(/\[([^[\]]+)\]/g)]
  return matches.length ? matches[matches.length - 1][1].trim() : null
}

// Resolves brandingType/cuttingBrandingType for a productionOrderItem from the
// order's KeyCRM custom_fields, by matching its own SKU prefix against the
// bracketed values selected in BRANDING_TYPE_FIELD_MAPPINGS fields.
export function resolveBrandingTypesFromCustomFields(
  customFields: ReadonlyArray<{ uuid: string; value: unknown }>,
  skuPrefix: string,
): { brandingType?: BrandingType[]; cuttingBrandingType?: BrandingType[] } {
  if (!skuPrefix) return {}
  const brandingType = new Set<BrandingType>()
  const cuttingBrandingType = new Set<BrandingType>()

  for (const mapping of BRANDING_TYPE_FIELD_MAPPINGS) {
    const field = customFields.find(f => f.uuid === mapping.uuid)
    const values = Array.isArray(field?.value) ? field.value : []
    const matched = values.some(v => typeof v === 'string' && extractSkuPrefixFromCustomFieldValue(v) === skuPrefix)
    if (matched) (mapping.isCutting ? cuttingBrandingType : brandingType).add(mapping.brandingType)
  }

  return {
    brandingType: brandingType.size ? [...brandingType] : undefined,
    cuttingBrandingType: cuttingBrandingType.size ? [...cuttingBrandingType] : undefined,
  }
}
