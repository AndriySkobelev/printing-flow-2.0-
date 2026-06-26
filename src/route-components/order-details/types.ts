export type BrandingTypeValue = 'dtf' | 'dtg' | 'flok' | 'embroidery' | 'sublimation'

export const BRANDING_TYPES: BrandingTypeValue[] = ['dtf', 'dtg', 'flok', 'embroidery', 'sublimation']

export const BRANDING_LABELS: Record<BrandingTypeValue, string> = {
  dtf:         'DTF',
  dtg:         'DTG',
  flok:        'Флок',
  embroidery:  'Вишивка',
  sublimation: 'Субліма',
}

export type OrderItem = {
  _id: string
  name: string
  color: string
  size: string
  quantity: number
  keycrmProductComment?: string | null
  brandingComment?: string | null
  sewingComment?: string | null
  isCustomCut?: boolean | null
  isCustomSewing?: boolean | null
  customCutComment?: string | null
  customSewingComment?: string | null
  shipmentType?: 'manufacturing' | 'warehouse' | null
  destination?: 'customer' | 'warehouse' | 'defects' | null
  brandingType?: BrandingTypeValue[] | null
  cuttingBrandingType?: BrandingTypeValue[] | null
}
