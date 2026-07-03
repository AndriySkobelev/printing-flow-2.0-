import { UTCDate } from "@date-fns/utc";
import { query, mutation, internalMutation } from "../_generated/server";
import type { MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { storeMovementsSchema, TRANSACTION_TYPES } from  "../schemas/storage";


export const getMovements = query({
  args: {},
  handler: async (ctx) => {
    const movments = await ctx.db.query('storeMovements').collect();
    return movments;
  }
})

export const getMovementsWithMaterials = query({
  handler: async (ctx) => {
    const movments = await ctx.db.query('storeMovements').collect();
    const movmentsWithMaterials = await Promise.all(movments.map(async (movement) => {
      if (movement.materialType === 'fabrics' && movement.materialId) {
        const material = await ctx.db.get('fabrics', movement.materialId as Id<'fabrics'>);
        return { ...movement, material };
      } else if (movement.materialType === 'materials' && movement.materialId) {
        const material = await ctx.db.get('materials', movement.materialId as Id<'materials'>);
        return { ...movement, material };
      }
      return movement;
    }));
    return movmentsWithMaterials;
  }
})

export const createIncoming = mutation({
  args: storeMovementsSchema,
  handler: async (ctx, args) => {
    const materials = await ctx.db.insert("storeMovements", args);
    return materials;
  }
})

export const createIncomingInternal = internalMutation({
  args: storeMovementsSchema,
  handler: async (ctx, args) => {
    const movement = await ctx.db.insert("storeMovements", args);
    return movement;
  }
})

// Reserves the materials needed to produce a set of production-order items.
// Spec material lines reference the generic parent fabric/material; a product's
// override (matched by lineId) references a specific fabricVariant/materialVariant
// instead, which is resolved back to its parent for the reservation.
export const createOrderMaterialReservations = async (ctx: MutationCtx, {
  keycrmOrderId,
  manager,
  orderShippingDate,
  items,
}: {
  keycrmOrderId: string,
  manager: string,
  orderShippingDate?: number,
  items: Array<{ sku: string, quantity: number, shipmentType: 'manufacturing' | 'warehouse' | null }>,
}) => {
  const orderId = Number(keycrmOrderId);
  const shippingDate = orderShippingDate ? new UTCDate(orderShippingDate).toISOString() : undefined;

  const reservations = new Map<string, {
    materialType: 'fabrics' | 'materials',
    materialId: Id<'fabrics'> | Id<'materials'>,
    quantity: number,
    productInfo: Array<string>,
  }>();

  for (const item of items) {
    if (item.shipmentType !== 'manufacturing') continue;

    const product = await ctx.db.query('products').withIndex('search_sku', q => q.eq('sku', item.sku)).unique();
    if (!product) continue;
    const spec = await ctx.db.get(product.parentId);
    if (!spec) continue;

    const productOverrides = product.materials ?? [];

    for (const specMaterial of spec.materials) {
      const override = productOverrides.find((m) => m.lineId && m.lineId === specMaterial.lineId);
      const multiplier = override?.multiplier ?? 1;

      let parentId: Id<'fabrics'> | Id<'materials'> | undefined;
      let materialType: 'fabrics' | 'materials';
      if (override) {
        // Product override references a specific variant — resolve it to its parent.
        materialType = override.type === 'material' ? 'materials' : 'fabrics';
        const variant = materialType === 'materials'
          ? await ctx.db.get('materialVariants', override.id as Id<'materialVariants'>)
          : await ctx.db.get('fabricVariants', override.id as Id<'fabricVariants'>);
        parentId = variant?.parentId as Id<'fabrics'> | Id<'materials'> | undefined;
      } else {
        // Spec's default material already references the parent directly.
        materialType = specMaterial.type === 'material' ? 'materials' : 'fabrics';
        parentId = specMaterial.id as Id<'fabrics'> | Id<'materials'>;
      }
      if (!parentId) continue;

      const lineQuantity = Number(specMaterial.quantity) * multiplier * item.quantity;
      const infoTag = `${item.sku}|${item.quantity}|${lineQuantity}`;

      const existing = reservations.get(parentId);
      if (existing) {
        existing.quantity += lineQuantity;
        existing.productInfo.push(infoTag);
      } else {
        reservations.set(parentId, {
          materialType,
          materialId: parentId,
          quantity: lineQuantity,
          productInfo: [infoTag],
        });
      }
    }
  }

  await Promise.all(Array.from(reservations.values()).map((reservation) =>
    ctx.db.insert('storeMovements', {
      type: TRANSACTION_TYPES.RESERVE,
      materialType: reservation.materialType,
      materialId: reservation.materialId,
      quantity: reservation.quantity,
      orderId: Number.isNaN(orderId) ? undefined : orderId,
      manager,
      orderShippingDate: shippingDate,
      productInfo: reservation.productInfo,
    })
  ));
}