import { UTCDate } from "@date-fns/utc";
import { query, mutation, internalMutation } from "../_generated/server";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { storeMovementsSchema } from  "../schemas/storage";

// Applies a movement's quantity onto the material variant's stock balance —
// incoming adds, outgoing subtracts — creating the balance row if this variant
// has never been tracked before. Returns the resulting `inStock` so the
// movement itself can record it as `balanceAfter`.
const applyMovementToStockBalance = async (ctx: MutationCtx, {
  materialType,
  materialId,
  quantity,
  type,
}: {
  materialType: 'fabricVariants' | 'materialVariants',
  materialId: Id<'fabricVariants'> | Id<'materialVariants'>,
  quantity: number,
  type: 'incoming' | 'outgoing',
}): Promise<number> => {
  const delta = type === 'incoming' ? quantity : -quantity;
  const updateAt = new UTCDate().valueOf();

  const existing = await ctx.db
    .query('stockBalances')
    .withIndex('by_materialId', q => q.eq('materialId', materialId))
    .first();

  const inStock = (existing?.inStock ?? 0) + delta;

  if (existing) {
    await ctx.db.patch(existing._id, { inStock, updateAt });
  } else {
    await ctx.db.insert('stockBalances', { materialType, materialId, inStock, reserved: 0, updateAt });
  }

  return inStock;
}

// Adds a reservation's quantity onto the material variant's `reserved` balance,
// creating the balance row (with inStock: 0) if this variant has never been
// tracked before.
const applyReservationToStockBalance = async (ctx: MutationCtx, {
  materialType,
  materialId,
  quantity,
}: {
  materialType: 'fabricVariants' | 'materialVariants',
  materialId: Id<'fabricVariants'> | Id<'materialVariants'>,
  quantity: number,
}) => {
  const updateAt = new UTCDate().valueOf();

  const existing = await ctx.db
    .query('stockBalances')
    .withIndex('by_materialId', q => q.eq('materialId', materialId))
    .first();

  if (existing) {
    await ctx.db.patch(existing._id, { reserved: existing.reserved + quantity, updateAt });
  } else {
    await ctx.db.insert('stockBalances', { materialType, materialId, inStock: 0, reserved: quantity, updateAt });
  }
}

export const getMovements = query({
  args: {},
  handler: async (ctx) => {
    const movments = await ctx.db.query('storeMovements').collect();
    return movments;
  }
})

// Resolves a fabricVariant/materialVariant id to its display info (parent
// name/units plus the variant's own color/size/sku).
const resolveVariantMaterial = async (ctx: QueryCtx, {
  materialType,
  materialId,
}: {
  materialType: 'fabricVariants' | 'materialVariants',
  materialId: Id<'fabricVariants'> | Id<'materialVariants'>,
}) => {
  if (materialType === 'fabricVariants') {
    const variant = await ctx.db.get('fabricVariants', materialId as Id<'fabricVariants'>);
    const material = variant ? await ctx.db.get('fabrics', variant.parentId) : null;
    return material ? { ...material, color: variant?.color, sku: variant?.sku } : null;
  }
  const variant = await ctx.db.get('materialVariants', materialId as Id<'materialVariants'>);
  const material = variant ? await ctx.db.get('materials', variant.parentId) : null;
  return material ? { ...material, color: variant?.color, size: variant?.size, sku: variant?.sku } : null;
}

export const getMovementsWithMaterials = query({
  handler: async (ctx) => {
    const movments = await ctx.db.query('storeMovements').collect();
    const movmentsWithMaterials = await Promise.all(movments.map(async (movement) => {
      if (!movement.materialId) return movement;
      const material = await resolveVariantMaterial(ctx, movement);
      return { ...movement, material };
    }));
    return movmentsWithMaterials;
  }
})

export const getStockBalancesWithMaterials = query({
  handler: async (ctx) => {
    const balances = await ctx.db.query('stockBalances').collect();
    return Promise.all(balances.map(async (balance) => {
      const material = await resolveVariantMaterial(ctx, balance);
      return { ...balance, material };
    }));
  }
})

export const createIncoming = mutation({
  args: storeMovementsSchema,
  handler: async (ctx, args) => {
    const materials = await ctx.db.insert("storeMovements", args);
    const balanceAfter = await applyMovementToStockBalance(ctx, { materialType: args.materialType, materialId: args.materialId, quantity: args.quantity, type: args.type });
    await ctx.db.patch(materials, { balanceAfter });
    return materials;
  }
})

export const createIncomingInternal = internalMutation({
  args: storeMovementsSchema,
  handler: async (ctx, args) => {
    const movement = await ctx.db.insert("storeMovements", args);
    const balanceAfter = await applyMovementToStockBalance(ctx, { materialType: args.materialType, materialId: args.materialId, quantity: args.quantity, type: args.type });
    await ctx.db.patch(movement, { balanceAfter });
    return movement;
  }
})

// Reserves the materials needed to produce a set of production-order items,
// one `reservations` row per (productionOrderItem, spec material line). Every
// manufacturing line MUST have a product-level material assignment (matched by
// lineId, a specific fabricVariant/materialVariant) — there is no generic
// parent-level fallback, so a missing assignment blocks the whole order from
// going to production (fail fast, before any reservation is written).
export const createOrderMaterialReservations = async (ctx: MutationCtx, {
  manager,
  orderShippingDate,
  items,
}: {
  manager: string,
  orderShippingDate?: number,
  items: Array<{ productionOrderItemId: Id<'productionOrderItems'>, productId: Id<'products'>, sku: string, quantity: number, shipmentType: 'manufacturing' | 'warehouse' | null }>,
}) => {
  const shippingDate = orderShippingDate ? new UTCDate(orderShippingDate).toISOString() : undefined;

  const pendingReservations: Array<{
    productionItemId: Id<'productionOrderItems'>,
    materialType: 'fabricVariants' | 'materialVariants',
    materialId: Id<'fabricVariants'> | Id<'materialVariants'>,
    quantity: number,
    productInfo: Array<string>,
  }> = [];
  const missingAssignments: Array<string> = [];

  for (const item of items) {
    if (item.shipmentType !== 'manufacturing') continue;

    const product = await ctx.db.get(item.productId);
    if (!product) { missingAssignments.push(`${item.sku}: товар не знайдено`); continue; }
    const spec = await ctx.db.get(product.parentId);
    if (!spec) { missingAssignments.push(`${item.sku}: специфікацію не знайдено`); continue; }

    const productOverrides = product.materials ?? [];

    for (const specMaterial of spec.materials) {
      const override = productOverrides.find((m) => m.lineId && m.lineId === specMaterial.lineId);
      if (!override) {
        missingAssignments.push(`${item.sku}: не призначено матеріал для "${specMaterial.name ?? specMaterial.lineId ?? '—'}"`);
        continue;
      }

      const materialType: 'fabricVariants' | 'materialVariants' = override.type === 'material' ? 'materialVariants' : 'fabricVariants';
      const multiplier = override.multiplier ?? 1;
      const quantity = Number(specMaterial.quantity) * multiplier * item.quantity;

      pendingReservations.push({
        productionItemId: item.productionOrderItemId,
        materialType,
        materialId: override.id as Id<'fabricVariants'> | Id<'materialVariants'>,
        quantity,
        productInfo: [`${item.sku}|${item.quantity}|${quantity}`],
      });
    }
  }

  if (missingAssignments.length > 0) {
    throw new Error(`Неможливо зарезервувати матеріали:\n${missingAssignments.join('\n')}`);
  }

  await Promise.all(pendingReservations.map((reservation) =>
    ctx.db.insert('reservations', {
      productionItemId: reservation.productionItemId,
      materialType: reservation.materialType,
      materialId: reservation.materialId,
      quantity: reservation.quantity,
      manager,
      orderShippingDate: shippingDate,
      productInfo: reservation.productInfo,
      status: 'active',
    })
  ));

  // Aggregate by material first and apply sequentially — the same variant can
  // be reserved by more than one line/item in this order, and concurrent
  // read-then-write on the same stockBalances row would otherwise lose updates.
  const quantityByMaterial = new Map<string, { materialType: 'fabricVariants' | 'materialVariants', materialId: Id<'fabricVariants'> | Id<'materialVariants'>, quantity: number }>();
  for (const reservation of pendingReservations) {
    const existing = quantityByMaterial.get(reservation.materialId);
    if (existing) {
      existing.quantity += reservation.quantity;
    } else {
      quantityByMaterial.set(reservation.materialId, {
        materialType: reservation.materialType,
        materialId: reservation.materialId,
        quantity: reservation.quantity,
      });
    }
  }

  for (const material of quantityByMaterial.values()) {
    await applyReservationToStockBalance(ctx, material);
  }
}