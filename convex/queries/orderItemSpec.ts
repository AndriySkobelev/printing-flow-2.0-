import { v } from 'convex/values'
import { query, mutation } from '../_generated/server'
import type { QueryCtx } from '../_generated/server'
import type { Doc, Id } from '../_generated/dataModel'

export type SpecLine = {
  lineId: string,
  name?: string,
  type: 'fabric' | 'material',
  id: Id<'fabricVariants'> | Id<'materialVariants'> | null,
  quantity: number,
}

const specLineV = v.object({
  lineId: v.optional(v.string()),
  name: v.optional(v.string()),
  type: v.union(v.literal('fabric'), v.literal('material')),
  id: v.union(v.id('fabricVariants'), v.id('materialVariants')),
  quantity: v.number(),
})

// The lines an item would use without its own copy: the spec's material lines,
// each with the variant (and multiplier) assigned to it on the product by
// lineId. `id` is null for a line the product has no assignment for yet.
export const getBaseSpecLines = async (ctx: QueryCtx, item: Doc<'productionOrderItems'>): Promise<Array<SpecLine> | null> => {
  if (!item.productId) return null
  const product = await ctx.db.get(item.productId)
  if (!product) return null
  const spec = await ctx.db.get(product.parentId)
  if (!spec) return null

  return spec.materials.map((m) => {
    const override = (product.materials ?? []).find(o => o.lineId && o.lineId === m.lineId)
    return {
      lineId: m.lineId ?? '',
      name: m.name,
      type: m.type ?? 'fabric',
      id: override?.id ?? null,
      quantity: Number(m.quantity) * (override?.multiplier ?? 1),
    }
  })
}

// The lines an item actually uses: its own edited copy, else the base lines.
export const getEffectiveSpecLines = async (ctx: QueryCtx, item: Doc<'productionOrderItems'>) => {
  if (item.specMaterials) return { isCustom: true, lines: item.specMaterials as Array<SpecLine> }
  const lines = await getBaseSpecLines(ctx, item)
  return lines ? { isCustom: false, lines } : null
}

// Display info for a line's variant: "name · size · color · sku" plus the
// parent's units.
export const resolveSpecLineVariant = async (ctx: QueryCtx, line: SpecLine) => {
  const empty = { label: null, sku: null, materialName: null, color: null, units: null }
  if (!line.id) return empty
  const variant: Doc<'materialVariants'> | Doc<'fabricVariants'> | null = line.type === 'material'
    ? await ctx.db.get(line.id as Id<'materialVariants'>)
    : await ctx.db.get(line.id as Id<'fabricVariants'>)
  if (!variant) return empty
  const parent = await ctx.db.get(variant.parentId)
  const size = 'size' in variant ? variant.size : undefined
  return {
    label: [parent?.name, size, variant.color, variant.sku].filter(Boolean).join(' · '),
    sku: variant.sku ?? null,
    materialName: parent?.name ?? null,
    color: variant.color ?? null,
    units: parent?.units ?? null,
  }
}

// Compares an edited copy against the base lines:
// - line count changed (added/removed) -> custom cut + custom sewing
// - same count, but some line's variant differs (or a line was swapped) -> custom cut only
// - only quantities changed -> not custom (affects reservations only)
const diffSpecLines = (base: Array<SpecLine>, edited: Array<SpecLine>) => {
  const countChanged = base.length !== edited.length
  const materialChanged = !countChanged && edited.some((line) => {
    const baseLine = base.find(b => b.lineId === line.lineId)
    // A base line with no product assignment yet has nothing to deviate from —
    // picking its variant here just fills it in.
    return !baseLine || baseLine.type !== line.type || (baseLine.id !== null && baseLine.id !== line.id)
  })
  const quantityChanged = edited.some((line) => {
    const baseLine = base.find(b => b.lineId === line.lineId)
    return !baseLine || Math.abs(baseLine.quantity - line.quantity) > 0.0001
  })
  const sameVariants = edited.every(line => base.find(b => b.lineId === line.lineId)?.id === line.id)
  return {
    identical: !countChanged && sameVariants && !quantityChanged,
    customCut: countChanged || materialChanged,
    customSewing: countChanged,
  }
}

// Sets isCustomCut/isCustomSewing when an edit calls for it, and clears them
// again only if this mechanism was the one that set them (auto* markers) —
// flags set by hand in the item edit form are left alone.
const resolveAutoCustomFlags = (item: Doc<'productionOrderItems'>, wantCut: boolean, wantSewing: boolean) => {
  const patch: Partial<Doc<'productionOrderItems'>> = {}
  if (wantCut && !item.isCustomCut) Object.assign(patch, { isCustomCut: true, autoCustomCut: true })
  if (!wantCut && item.autoCustomCut) Object.assign(patch, { isCustomCut: false, autoCustomCut: false })
  if (wantSewing && !item.isCustomSewing) Object.assign(patch, { isCustomSewing: true, autoCustomSewing: true })
  if (!wantSewing && item.autoCustomSewing) Object.assign(patch, { isCustomSewing: false, autoCustomSewing: false })
  return patch
}

const getEditableItem = async (ctx: QueryCtx, itemId: Id<'productionOrderItems'>) => {
  const item = await ctx.db.get(itemId)
  if (!item) throw new Error('Товар не знайдено')
  if (item.inProduction) throw new Error('Товар вже у виробництві — специфікацію змінити не можна')
  return item
}

export const getOrderItemSpecMaterials = query({
  args: { itemId: v.id('productionOrderItems') },
  handler: async (ctx, { itemId }) => {
    const item = await ctx.db.get(itemId)
    if (!item) return null

    const effective = await getEffectiveSpecLines(ctx, item)
    if (!effective) return null

    const withLabels = await Promise.all(effective.lines.map(async (line) => {
      const { label } = await resolveSpecLineVariant(ctx, line)
      return { ...line, label }
    }))

    return {
      isCustom: effective.isCustom,
      inProduction: item.inProduction ?? false,
      lines: withLabels,
    }
  },
})

export const updateOrderItemSpecMaterials = mutation({
  args: {
    itemId: v.id('productionOrderItems'),
    materials: v.array(specLineV),
  },
  handler: async (ctx, { itemId, materials }) => {
    const item = await getEditableItem(ctx, itemId)
    const base = await getBaseSpecLines(ctx, item)
    if (!base) throw new Error('Специфікацію товару не знайдено')

    const edited = materials.map(m => ({ ...m, lineId: m.lineId ?? crypto.randomUUID() }))
    const { identical, customCut, customSewing } = diffSpecLines(base, edited)

    await ctx.db.patch(itemId, {
      // Same as the base spec again — drop the copy instead of keeping a no-op.
      specMaterials: identical ? undefined : edited,
      ...resolveAutoCustomFlags(item, customCut, customSewing),
    })
  },
})

export const resetOrderItemSpecMaterials = mutation({
  args: { itemId: v.id('productionOrderItems') },
  handler: async (ctx, { itemId }) => {
    const item = await getEditableItem(ctx, itemId)
    await ctx.db.patch(itemId, {
      specMaterials: undefined,
      ...resolveAutoCustomFlags(item, false, false),
    })
  },
})
