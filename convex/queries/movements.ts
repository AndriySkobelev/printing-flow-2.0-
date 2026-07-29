import { v } from "convex/values";
import { omit } from "ramda";
import { UTCDate } from "@date-fns/utc";
import { paginationOptsValidator } from "convex/server";
import { query, mutation } from "../_generated/server";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "../_generated/dataModel";
import { storeMovementsSchema } from  "../schemas/storage";
import { resolveMaterialParent } from "./specifications";

// Applies a movement's quantity onto the material variant's stock balance —
// incoming adds, outgoing subtracts — creating the balance row if this variant
// has never been tracked before. Returns the resulting `inStock` so the
// movement itself can record it as `balanceAfter`.
const applyMovementToStockBalance = async (ctx: MutationCtx, {
  materialType,
  materialId,
  quantity,
  type,
  userId,
}: {
  materialType: 'fabricVariants' | 'materialVariants',
  materialId: Id<'fabricVariants'> | Id<'materialVariants'>,
  quantity: number,
  type: 'incoming' | 'outgoing',
  userId: Id<'users'>,
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
    await ctx.db.insert('stockBalances', { materialType, materialId, inStock, reserved: 0, updateAt, userId });
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
  userId,
}: {
  materialType: 'fabricVariants' | 'materialVariants',
  materialId: Id<'fabricVariants'> | Id<'materialVariants'>,
  quantity: number,
  userId: Id<'users'>,
}) => {
  const updateAt = new UTCDate().valueOf();

  const existing = await ctx.db
    .query('stockBalances')
    .withIndex('by_materialId', q => q.eq('materialId', materialId))
    .first();

  if (existing) {
    await ctx.db.patch(existing._id, { reserved: existing.reserved + quantity, updateAt });
  } else {
    await ctx.db.insert('stockBalances', { materialType, materialId, inStock: 0, reserved: quantity, updateAt, userId });
  }
}

export const getMovements = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    return ctx.db.query('storeMovements').order('desc').paginate(args.paginationOpts);
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
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const result = await ctx.db.query('storeMovements').order('desc').paginate(args.paginationOpts);
    const page = await Promise.all(result.page.map(async (movement) => {
      if (!movement.materialId) return movement;
      const material = await resolveVariantMaterial(ctx, movement);
      return { ...movement, material };
    }));
    return { ...result, page };
  }
})

export const getStockBalancesWithMaterials = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const result = await ctx.db.query('stockBalances').paginate(args.paginationOpts);
    const page = await Promise.all(result.page.map(async (balance) => {
      const material = await resolveVariantMaterial(ctx, balance);
      return { ...balance, material };
    }));
    return { ...result, page };
  }
})

type RequiredMaterial = {
  unassigned: boolean,
  materialType: 'fabricVariants' | 'materialVariants' | 'fabrics' | 'materials',
  materialId: Id<'fabricVariants'> | Id<'materialVariants'> | Id<'fabrics'> | Id<'materials'>,
  units: string,
  quantity: number,
}

// What this order needs to be produced, aggregated per material, alongside
// current stock. Mirrors createOrderMaterialReservations's resolution (product
// assignment by lineId wins, else the spec's generic default) but is read-only
// and, unlike the reservation flow, still reports lines with no product-level
// assignment yet (flagged `unassigned`, no stock to check against since we
// don't know which variant will end up being consumed).
export const getOrderRequiredMaterials = query({
  args: { productionOrderId: v.id('productionOrders') },
  handler: async (ctx, { productionOrderId }) => {
    const allItems = await ctx.db
      .query('productionOrderItems')
      .withIndex('by_productionOrder', q => q.eq('productionOrderId', productionOrderId))
      .collect();
    const items = allItems.filter(item => item.shipmentType === 'manufacturing');

    // Phase 1: batch-fetch deduplicated products, then their specs.
    const productIds = [...new Set(items.map(item => item.productId))];
    const products = await Promise.all(productIds.map(id => ctx.db.get(id)));
    const productById = new Map(products.filter((p): p is NonNullable<typeof p> => !!p).map(p => [p._id, p]));

    const specIds = [...new Set([...productById.values()].map(p => p.parentId))];
    const specs = await Promise.all(specIds.map(id => ctx.db.get(id)));
    const specById = new Map(specs.filter((s): s is NonNullable<typeof s> => !!s).map(s => [s._id, s]));

    // Phase 2: sync aggregation across items using the prefetched maps.
    const requiredByMaterial = new Map<string, RequiredMaterial>();
    for (const item of items) {
      const product = productById.get(item.productId);
      if (!product) continue;
      const spec = specById.get(product.parentId);
      if (!spec) continue;

      const productOverrides = product.materials ?? [];

      for (const specMaterial of spec.materials) {
        const override = productOverrides.find((m) => m.lineId && m.lineId === specMaterial.lineId);

        const materialType = override
          ? (override.type === 'material' ? 'materialVariants' as const : 'fabricVariants' as const)
          : (specMaterial.type === 'material' ? 'materials' as const : 'fabrics' as const)
        const materialId = override ? override.id : specMaterial.id;
        const multiplier = override?.multiplier ?? 1;
        const quantity = Number(specMaterial.quantity) * multiplier * item.quantity;

        const key = `${materialType}:${materialId}`;
        const existing = requiredByMaterial.get(key);
        if (existing) {
          existing.quantity += quantity;
        } else {
          requiredByMaterial.set(key, {
            unassigned: !override,
            materialType,
            materialId,
            units: specMaterial.units,
            quantity,
          });
        }
      }
    }

    // Phase 3: enrich each aggregated material with display info + stock balance.
    return Promise.all(Array.from(requiredByMaterial.values()).map(async (required) => {
      if (required.unassigned) {
        const material = await resolveMaterialParent(ctx, {
          id: required.materialId,
          type: required.materialType === 'materials' ? 'material' : 'fabric',
        });
        return { ...required, material, inStock: null, reserved: null, available: null };
      }

      const variantKey = required as { materialType: 'fabricVariants' | 'materialVariants', materialId: Id<'fabricVariants'> | Id<'materialVariants'> };
      const [material, balance] = await Promise.all([
        resolveVariantMaterial(ctx, variantKey),
        ctx.db.query('stockBalances').withIndex('by_materialId', q => q.eq('materialId', variantKey.materialId)).first(),
      ]);
      const inStock = balance?.inStock ?? 0;
      const reserved = balance?.reserved ?? 0;
      return { ...required, material, inStock, reserved, available: inStock - reserved };
    }));
  }
})

export const createIncoming = mutation({
  args: omit(['userId'], storeMovementsSchema) as Omit<typeof storeMovementsSchema, 'userId'>,
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Not authenticated');

    const materials = await ctx.db.insert("storeMovements", { ...args, userId });
    const balanceAfter = await applyMovementToStockBalance(ctx, { materialType: args.materialType, materialId: args.materialId, quantity: args.quantity, type: args.type, userId });
    await ctx.db.patch(materials, { balanceAfter });
    return materials;
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
  userId,
}: {
  manager: string,
  orderShippingDate?: number,
  items: Array<{ productionOrderItemId: Id<'productionOrderItems'>, productId: Id<'products'>, sku: string, quantity: number, shipmentType: 'manufacturing' | 'warehouse' | null }>,
  userId: Id<'users'>,
}) => {
  const shippingDate = orderShippingDate ? new UTCDate(orderShippingDate).toISOString() : undefined;

  const pendingReservations: Array<{
    productionOrderItemId: Id<'productionOrderItems'>,
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
        productionOrderItemId: item.productionOrderItemId,
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
      productionOrderItemId: reservation.productionOrderItemId,
      materialType: reservation.materialType,
      materialId: reservation.materialId,
      quantity: reservation.quantity,
      manager,
      orderShippingDate: shippingDate,
      productInfo: reservation.productInfo,
      status: 'active',
      userId,
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
    await applyReservationToStockBalance(ctx, { ...material, userId });
  }
}

// Releases a portion of a production-order item's active reservations into
// actual consumption — called as the item progresses through production
// (e.g. cutting). `fraction` is how much of the item's total quantity was
// just completed (0..1): each active reservation for this item has that same
// fraction of its (fixed, original) `quantity` moved into `fulfilledQty`,
// subtracted from both `reserved` and `inStock` (the material has physically
// left the shelf) and logged as an outgoing movement. A reservation whose
// fulfilledQty reaches its quantity is marked fulfilled.
//
// If the requested fraction needs more than what's left un-fulfilled on the
// reservation (e.g. the item's quantity grew after materials were reserved),
// the excess ("плюси") is logged as its own outgoing movement — it still
// reduces inStock, but there's nothing left in `reserved` to release for it.
export const consumeItemReservations = async (ctx: MutationCtx, {
  productionOrderItemId,
  fraction,
  manager,
  materialTypes,
  orderId,
  productQuantity,
  userId,
}: {
  productionOrderItemId: Id<'productionOrderItems'>,
  fraction: number,
  manager?: string,
  materialTypes?: Array<'fabricVariants' | 'materialVariants'>,
  orderId?: number,
  productQuantity?: number,
  userId: Id<'users'>,
}) => {
  if (fraction <= 0) return;

  const activeReservations = await ctx.db
    .query('reservations')
    .withIndex('by_productionOrderItemId', q => q.eq('productionOrderItemId', productionOrderItemId))
    .filter(q => q.eq(q.field('status'), 'active'))
    .collect();

  const relevantReservations = materialTypes
    ? activeReservations.filter(r => materialTypes.includes(r.materialType))
    : activeReservations;

  // Applies an outgoing movement for `qty` of one material: always reduces
  // inStock, optionally also releases the same amount from `reserved`.
  const applyOutgoing = async (
    reservation: { materialType: 'fabricVariants' | 'materialVariants', materialId: Id<'fabricVariants'> | Id<'materialVariants'> },
    qty: number,
    { releaseReserved, description }: { releaseReserved: boolean, description?: string },
  ) => {
    const updateAt = new UTCDate().valueOf();
    const balance = await ctx.db
      .query('stockBalances')
      .withIndex('by_materialId', q => q.eq('materialId', reservation.materialId))
      .first();
    const inStock = (balance?.inStock ?? 0) - qty;
    const reserved = releaseReserved ? Math.max(0, (balance?.reserved ?? 0) - qty) : (balance?.reserved ?? 0);

    if (balance) {
      await ctx.db.patch(balance._id, { inStock, reserved, updateAt });
    } else {
      await ctx.db.insert('stockBalances', { materialType: reservation.materialType, materialId: reservation.materialId, inStock, reserved, updateAt, userId });
    }

    await ctx.db.insert('storeMovements', {
      type: 'outgoing',
      materialType: reservation.materialType,
      materialId: reservation.materialId,
      quantity: qty,
      manager,
      orderId,
      productQuantity,
      balanceAfter: inStock,
      description,
      userId,
    });

    return inStock;
  };

  for (const reservation of relevantReservations) {
    const alreadyFulfilled = reservation.fulfilledQty ?? 0;
    const remaining = Math.max(0, reservation.quantity - alreadyFulfilled);
    const desiredQty = reservation.quantity * fraction;
    if (desiredQty <= 0) continue;

    const consumeQty = Math.min(remaining, desiredQty);
    const extraQty = desiredQty - consumeQty;

    if (consumeQty > 0) {
      await applyOutgoing(reservation, consumeQty, { releaseReserved: true });

      const fulfilledQty = alreadyFulfilled + consumeQty;
      await ctx.db.patch(reservation._id, fulfilledQty >= reservation.quantity - 0.0001
        ? { fulfilledQty: reservation.quantity, status: 'fulfilled' }
        : { fulfilledQty });
    }

    if (extraQty > 0) {
      await applyOutgoing(reservation, extraQty, { releaseReserved: false, description: 'плюси' });
    }
  }
}