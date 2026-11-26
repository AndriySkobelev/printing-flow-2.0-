import type { UserRole } from './roles'

// Price of a product with prints, from the «вартість друку» sheet.
// Shared by the app (calculator) and Convex (settings defaults).

// ───────── Print: (width × height × RATE + base) × multiplier for the print run ─────────

export const PRINT_RATE_PER_CM2 = 0.07

// A print wider or taller than this is large and uses the large base.
export const PRINT_STANDARD_MAX_WIDTH_CM  = 40
export const PRINT_STANDARD_MAX_HEIGHT_CM = 50

// Defaults until an admin saves their own in systemSettings.
export const DEFAULT_PRINT_BASE_STANDARD = 45
export const DEFAULT_PRINT_BASE_LARGE    = 58

export const PRINT_PRICING_EDITORS: UserRole[] = ['super_admin', 'admin']

export const canEditPrintPricing = (role?: UserRole) => !!role && PRINT_PRICING_EDITORS.includes(role)

// The first row whose maxQty covers the print run. The sheet says «до 99» for
// print 1 and «до 100» for prints 2–5 — 100 is used.
export const PRINT_QTY_MULTIPLIERS: ReadonlyArray<{ maxQty: number; multiplier: number }> = [
  { maxQty: 5,        multiplier: 2.4 },
  { maxQty: 15,       multiplier: 2.2 },
  { maxQty: 30,       multiplier: 2.0 },
  { maxQty: 49,       multiplier: 1.8 },
  { maxQty: 100,      multiplier: 1.6 },
  { maxQty: 199,      multiplier: 1.5 },
  { maxQty: Infinity, multiplier: 1.4 },
]

export const MAX_PRINTS_PER_ITEM = 5

// ───────── Product: the spec's sale price × the factor for the quantity ─────────

export const ITEM_QTY_TIERS: ReadonlyArray<{ maxQty: number; factor: number }> = [
  { maxQty: 5,        factor: 1 },
  { maxQty: 15,       factor: 0.95 },
  { maxQty: 30,       factor: 0.85 },
  { maxQty: 49,       factor: 0.78 },
  { maxQty: Infinity, factor: 0.73 },
]

export type PrintBases = { standard: number; large: number }

export type PrintInput = { widthCm: number; heightCm: number; quantity: number }

export const isLargePrint = ({ widthCm, heightCm }: Pick<PrintInput, 'widthCm' | 'heightCm'>) =>
  widthCm > PRINT_STANDARD_MAX_WIDTH_CM || heightCm > PRINT_STANDARD_MAX_HEIGHT_CM

export const printQtyMultiplier = (quantity: number) =>
  PRINT_QTY_MULTIPLIERS.find(t => quantity <= t.maxQty)!.multiplier

export const printUnitPrice = (print: PrintInput, bases: PrintBases) => {
  const base = isLargePrint(print) ? bases.large : bases.standard
  return (print.widthCm * print.heightCm * PRINT_RATE_PER_CM2 + base) * printQtyMultiplier(print.quantity)
}

export const itemQtyFactor = (quantity: number) =>
  ITEM_QTY_TIERS.find(t => quantity <= t.maxQty)!.factor

export const itemUnitPrice = (salePrice: number, quantity: number) =>
  quantity > 0 ? salePrice * itemQtyFactor(quantity) : 0
