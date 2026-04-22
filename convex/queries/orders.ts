import { v } from 'convex/values'
import { mutation } from '../_generated/server'
import type { MutationCtx } from '../_generated/server'

async function resolveFabricName(ctx: MutationCtx, sku: string): Promise<string> {
  const product = await ctx.db
    .query('products')
    .withIndex('search_sku', q => q.eq('sku', sku))
    .first();
  if (!product) return sku;

  const spec = await ctx.db.get(product.parentId);
  const fabricMaterial = spec?.materials?.find((m: any) => m.type === 'fabric');
  if (!fabricMaterial?.fabricId) return sku;

  const fabric = await ctx.db.get(fabricMaterial.fabricId);
  return fabric?.fabricName ?? sku;
}

type OrderItemEntry = {
  id: string;
  product: any;
  color: string;
  size: string;
  needsCutting: boolean;
};

export const creatreProductionTask = mutation({
  args: {
    externalData: v.any()
  },
  handler: async (ctx, args) => {
    const { externalData } = args;
    const keycrmOrderId = String(externalData.id);

    // 0. Guard against duplicates
    const existing = await ctx.db
      .query('productionOrders')
      .withIndex('by_keycrmOrderId', q => q.eq('keycrmOrderId', keycrmOrderId))
      .first();
    if (existing) return null;

    // 1. Create productionOrder
    const plannedShipDate = externalData.shipping?.shipping_date_actual
      ? new Date(externalData.shipping.shipping_date_actual).getTime()
      : Date.now();

    const productionOrderId = await ctx.db.insert('productionOrders', {
      keycrmOrderId,
      startDate: Date.now(),
      plannedShipDate,
      status: 'active',
    });

    // 2. Filter physical products — skip services (shipment_type === null or no size in properties)
    const physicalProducts = (externalData.products ?? []).filter(
      (p: any) => p.shipment_type !== null && p.properties?.some((prop: any) => prop.name === 'розмір')
    );

    // 3. Create productionOrderItems
    const orderItems: OrderItemEntry[] = [];

    for (const product of physicalProducts) {
      const color = product.properties.find((p: any) => p.name === 'колір')?.value ?? '';
      const size  = product.properties.find((p: any) => p.name === 'розмір')?.value ?? '';

      let processingType: 'branding' | 'embroidery' | 'silkscreen' | 'none' = 'none';
      if (product.product_status_id != null) {
        const mapping = await ctx.db
          .query('productStatusMappings')
          .withIndex('by_keycrmStatusId', q => q.eq('keycrmStatusId', product.product_status_id))
          .first();
        if (mapping) processingType = mapping.processingType;
      }

      const shipmentType = product.shipment_type as 'manufacturing' | 'warehouse';
      const needsCutting = shipmentType === 'manufacturing';

      const itemId = await ctx.db.insert('productionOrderItems', {
        productionOrderId,
        keycrmOrderId,
        keycrmProductId: product.offer.product_id,
        name: product.name,
        sku: product.sku,
        color,
        size,
        quantity: product.quantity,
        shipmentType,
        keycrmProductStatusId: product.product_status_id ?? null,
        processingType,
        needsCutting,
        needsSewing:        needsCutting,
        needsBranding:      processingType === 'branding',
        needsSubcontractor: processingType === 'embroidery' || processingType === 'silkscreen',
        needsPackaging:     true,
      });

      orderItems.push({ id: itemId as unknown as string, product, color, size, needsCutting });
    }

    // 4. Group manufacturing items by specName+color → one cuttingTask per group
    const cuttingGroups = new Map<string, OrderItemEntry[]>();
    for (const item of orderItems.filter(i => i.needsCutting)) {
      const key = `${item.product.name}__${item.color}`;
      if (!cuttingGroups.has(key)) cuttingGroups.set(key, []);
      cuttingGroups.get(key)!.push(item);
    }

    for (const items of cuttingGroups.values()) {
      const { product, color } = items[0];
      const specName  = product.name as string;
      const fabric = await resolveFabricName(ctx, items[0].product.sku as string);

      const cuttingTaskId = await ctx.db.insert('cuttingTasks', {
        productionOrderId,
        keycrmOrderId,
        specName,
        fabric,
        color,
        status: 'new',
      });

      for (const item of items) {
        await ctx.db.insert('cuttingTaskSizes', {
          cuttingTaskId,
          productionOrderItemId: item.id as any,
          size: item.size,
          quantity: item.product.quantity,
          completedQty: 0,
        });
      }
    }

    return { productionOrderId };
  },
})
