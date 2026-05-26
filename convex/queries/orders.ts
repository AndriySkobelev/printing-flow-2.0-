import { v } from 'convex/values'
import { query, mutation } from '../_generated/server'
import type { MutationCtx } from '../_generated/server'

async function resolveMaterialProcessingType(ctx: MutationCtx, sku: string): Promise<string | null> {
  const product = await ctx.db
    .query('products')
    .withIndex('search_sku', q => q.eq('sku', sku))
    .first();
  return (product as any)?.processingType ?? null;
}

async function resolveFabricName(ctx: MutationCtx, sku: string): Promise<string> {
  if (!sku) return ''

  const skuPrefix = sku.split('-')[0]
  if (!skuPrefix) return sku

  const spec = await ctx.db
    .query('specifications')
    .withIndex('search_skuPrefix', q => q.eq('skuPrefix', skuPrefix))
    .first()

  if (!spec) return sku

  const fabricMaterial = (spec.materials ?? []).find((m: any) => m.fabricId)
  if (!fabricMaterial?.fabricId) return sku

  const fabric = await ctx.db.get(fabricMaterial.fabricId)
  return fabric?.fabricName ?? sku
}

type OrderItemEntry = {
  id: string;
  product: any;
  color: string;
  size: string;
  needsCutting: boolean;
};

async function createCuttingTasks(ctx: MutationCtx, { productionOrderId, plannedShipDate, keycrmOrderId, orderItems }: {
  productionOrderId: any
  keycrmOrderId: string
  plannedShipDate: number,
  orderItems: OrderItemEntry[]
}): Promise<Map<string, string>> {
  const cuttingGroups = new Map<string, OrderItemEntry[]>();
  for (const item of orderItems.filter(i => i.needsCutting)) {
    const key = `${item.product.name}__${item.color}`;
    if (!cuttingGroups.has(key)) cuttingGroups.set(key, []);
    cuttingGroups.get(key)!.push(item);
  }

  const totalTasks = cuttingGroups.size
  let taskIndex = 1
  const groupToCuttingTaskId = new Map<string, string>()

  for (const [key, items] of cuttingGroups.entries()) {
    const { product, color } = items[0];
    const specName = product.name as string;
    const fabric   = await resolveFabricName(ctx, items[0].product.sku as string);

    const cuttingTaskId = await ctx.db.insert('cuttingTasks', {
      color,
      fabric,
      specName,
      keycrmOrderId,
      status: 'new',
      productionOrderId,
      endDate: plannedShipDate,
      orderIndex: totalTasks === 1 ? keycrmOrderId : `${keycrmOrderId}-(${taskIndex++})`,
    });

    groupToCuttingTaskId.set(key, cuttingTaskId as unknown as string)

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

  return groupToCuttingTaskId
}

async function createSewingTasks(ctx: MutationCtx, { productionOrderId, plannedShipDate, keycrmOrderId, orderItems, cuttingTaskIds }: {
  productionOrderId: any
  keycrmOrderId: string
  plannedShipDate: number
  orderItems: OrderItemEntry[]
  cuttingTaskIds: Map<string, string>
}) {
  const sewingGroups = new Map<string, OrderItemEntry[]>()
  for (const item of orderItems.filter(i => i.needsCutting)) {
    const key = `${item.product.name}__${item.color}`
    if (!sewingGroups.has(key)) sewingGroups.set(key, [])
    sewingGroups.get(key)!.push(item)
  }

  const totalTasks = sewingGroups.size
  let taskIndex = 1

  for (const [key, items] of sewingGroups.entries()) {
    const { product, color } = items[0]
    const skuPrefix     = (product.sku as string ?? '').split('-')[0]
    const spec          = await ctx.db.query('specifications').withIndex('search_skuPrefix', q => q.eq('skuPrefix', skuPrefix)).first()
    const specName      = spec?.name ?? (product.name as string)
    const totalQuantity = items.reduce((s, i) => s + (i.product.quantity as number), 0)
    const cuttingTaskId = cuttingTaskIds.get(key)

    const sewingTaskId = await ctx.db.insert('sewingTasks', {
      productionOrderId,
      keycrmOrderId,
      specName,
      color,
      totalQuantity,
      startDate: Date.now(),
      endDate:   plannedShipDate,
      status:    'new',
      orderIndex:    totalTasks === 1 ? keycrmOrderId : `${keycrmOrderId}-(${taskIndex++})`,
      cuttingTaskId: cuttingTaskId as any,
    })

    for (const item of items) {
      await ctx.db.insert('sewingSubTasks', {
        sewingTaskId,
        productionOrderItemId: item.id as any,
        size:         item.size,
        quantity:     item.product.quantity as number,
        completedQty: 0,
        status:       'new',
      })
    }
  }
}

async function createBrandingTasks(ctx: MutationCtx, { productionOrderId, keycrmOrderId, plannedShipDate, externalData, attachedFiles }: {
  productionOrderId: any
  keycrmOrderId: string
  plannedShipDate: number
  externalData: any
  attachedFiles?: any[]
}) {
  const tags = (externalData.tags ?? [])
    .filter((t: any) => t?.name)
    .map((t: any) => ({ name: String(t.name), color: String(t.color ?? '#6b7280') }))

  await ctx.db.insert('brandingTasks', {
    productionOrderId,
    keycrmOrderId,
    startDate: Date.now(),
    endDate: plannedShipDate,
    status: 'new',
    manager:         externalData.manager?.full_name ?? undefined,
    identifierName:  externalData.source_uuid        ?? undefined,
    tags:            tags.length ? tags : undefined,
    attachedFiles:   attachedFiles?.length ? attachedFiles : undefined,
  });
}

export const getAllProductionOrdersWithProgress = query({
  args: {},
  handler: async (ctx) => {
    const orders = await ctx.db.query('productionOrders').collect()

    const result = await Promise.all(orders.map(async (order) => {
      const items = await ctx.db
        .query('productionOrderItems')
        .withIndex('by_productionOrder', q => q.eq('productionOrderId', order._id))
        .collect()

      const totalQty = items.reduce((s, i) => s + i.quantity, 0)

      // Cutting
      const cuttingTasks = await ctx.db
        .query('cuttingTasks')
        .withIndex('by_productionOrder', q => q.eq('productionOrderId', order._id))
        .collect()
      let cutTotal = 0, cutDone = 0
      for (const ct of cuttingTasks) {
        const sizes = await ctx.db
          .query('cuttingTaskSizes')
          .withIndex('by_cuttingTask', q => q.eq('cuttingTaskId', ct._id))
          .collect()
        for (const sz of sizes) { cutTotal += sz.quantity; cutDone += sz.completedQty }
      }

      // Sewing
      const sewingTasks = await ctx.db
        .query('sewingTasks')
        .withIndex('by_productionOrder', q => q.eq('productionOrderId', order._id))
        .collect()
      let sewTotal = 0, sewDone = 0
      for (const st of sewingTasks) {
        const subTasks = await ctx.db
          .query('sewingSubTasks')
          .withIndex('by_sewingTask', q => q.eq('sewingTaskId', st._id))
          .collect()
        for (const sub of subTasks) { sewTotal += sub.quantity; sewDone += sub.completedQty ?? 0 }
      }

      // Branding
      const brandingTask = await ctx.db
        .query('brandingTasks')
        .withIndex('by_productionOrder', q => q.eq('productionOrderId', order._id))
        .first()
      const brandingTotal = items.filter(i => i.needsBranding).reduce((s, i) => s + i.quantity, 0)
      let brandingDone = 0
      if (brandingTask) {
        const logs = await ctx.db
          .query('brandingLogs')
          .withIndex('by_brandingTask', q => q.eq('brandingTaskId', brandingTask._id))
          .collect()
        brandingDone = logs.filter(l => l.type === 'completed').reduce((s, l) => s + l.quantity, 0)
      }

      // Packing
      const packagingTask = await ctx.db
        .query('packagingTasks')
        .withIndex('by_productionOrder', q => q.eq('productionOrderId', order._id))
        .first()
      const packingTotal = items.filter(i => i.needsPackaging).reduce((s, i) => s + i.quantity, 0)
      let packingDone = 0
      if (packagingTask) {
        const logs = await ctx.db
          .query('packagingLogs')
          .withIndex('by_packagingTask', q => q.eq('packagingTaskId', packagingTask._id))
          .collect()
        packingDone = logs.filter(l => l.type === 'completed').reduce((s, l) => s + l.quantity, 0)
      }

      return {
        _id:             order._id,
        group:           `#${order.keycrmOrderId}`,
        keycrmOrderId:   order.keycrmOrderId,
        keycrmManager:   order.keycrmManager,
        plannedShipDate: order.plannedShipDate,
        totalQty,
        cutDone,      cutTotal,
        sewDone,      sewTotal,
        brandingDone, brandingTotal,
        packingDone,  packingTotal,
        data: items.map(i => ({
          _id:      i._id,
          name:     i.name,
          sku:      i.sku,
          color:    i.color,
          size:     i.size,
          quantity: i.quantity,
        })),
      }
    }))

    return result.sort((a, b) => b.plannedShipDate - a.plannedShipDate)
  },
})

export const getProductionOrderDetails = query({
  args: { productionOrderId: v.id('productionOrders') },
  handler: async (ctx, { productionOrderId }) => {
    const order = await ctx.db.get(productionOrderId)
    if (!order) return null

    const items = await ctx.db
      .query('productionOrderItems')
      .withIndex('by_productionOrder', q => q.eq('productionOrderId', productionOrderId))
      .collect()

    const totalQty = items.reduce((s, i) => s + i.quantity, 0)

    // Cutting progress
    const cuttingTasks = await ctx.db
      .query('cuttingTasks')
      .withIndex('by_productionOrder', q => q.eq('productionOrderId', productionOrderId))
      .collect()
    let cutTotal = 0, cutDone = 0
    for (const ct of cuttingTasks) {
      const sizes = await ctx.db
        .query('cuttingTaskSizes')
        .withIndex('by_cuttingTask', q => q.eq('cuttingTaskId', ct._id))
        .collect()
      for (const sz of sizes) { cutTotal += sz.quantity; cutDone += sz.completedQty }
    }

    // Sewing progress
    const sewingTasks = await ctx.db
      .query('sewingTasks')
      .withIndex('by_productionOrder', q => q.eq('productionOrderId', productionOrderId))
      .collect()
    let sewTotal = 0, sewDone = 0
    for (const st of sewingTasks) {
      const subTasks = await ctx.db
        .query('sewingSubTasks')
        .withIndex('by_sewingTask', q => q.eq('sewingTaskId', st._id))
        .collect()
      for (const sub of subTasks) { sewTotal += sub.quantity; sewDone += sub.completedQty ?? 0 }
    }

    // Branding progress
    const brandingTask = await ctx.db
      .query('brandingTasks')
      .withIndex('by_productionOrder', q => q.eq('productionOrderId', productionOrderId))
      .first()
    const brandingTotal = items.filter(i => i.needsBranding).reduce((s, i) => s + i.quantity, 0)
    let brandingDone = 0
    if (brandingTask) {
      const logs = await ctx.db
        .query('brandingLogs')
        .withIndex('by_brandingTask', q => q.eq('brandingTaskId', brandingTask._id))
        .collect()
      brandingDone = logs.filter(l => l.type === 'completed').reduce((s, l) => s + l.quantity, 0)
    }

    // Packing progress
    const packagingTask = await ctx.db
      .query('packagingTasks')
      .withIndex('by_productionOrder', q => q.eq('productionOrderId', productionOrderId))
      .first()
    const packingTotal = items.filter(i => i.needsPackaging).reduce((s, i) => s + i.quantity, 0)
    let packingDone = 0
    if (packagingTask) {
      const logs = await ctx.db
        .query('packagingLogs')
        .withIndex('by_packagingTask', q => q.eq('packagingTaskId', packagingTask._id))
        .collect()
      packingDone = logs.filter(l => l.type === 'completed').reduce((s, l) => s + l.quantity, 0)
    }

    return {
      _id: order._id,
      keycrmOrderId: order.keycrmOrderId,
      keycrmManager: order.keycrmManager,
      plannedShipDate: order.plannedShipDate,
      status: order.status,
      totalQty,
      cutDone,      cutTotal,
      sewDone,      sewTotal,
      brandingDone, brandingTotal,
      packingDone,  packingTotal,
      attachedFiles: brandingTask?.attachedFiles ?? [],
      items: items.map(i => ({
        _id:                  i._id,
        name:                 i.name,
        sku:                  i.sku,
        color:                i.color,
        size:                 i.size,
        quantity:             i.quantity,
        keycrmProductComment: i.keycrmProductComment ?? null,
        comment:              i.comment ?? null,
        shipmentType:         i.shipmentType,
        processingType:       i.processingType ?? null,
        brandingType:         i.brandingType ?? null,
        cuttingBrandingType:  i.cuttingBrandingType ?? null,
      })),
    }
  },
})

export const updateOrderItemBrandingType = mutation({
  args: {
    itemId: v.id('productionOrderItems'),
    brandingType: v.optional(v.array(v.union(
      v.literal('dtf'),
      v.literal('dtg'),
      v.literal('flok'),
      v.literal('embroidery'),
      v.literal('sublimation'),
    ))),
  },
  handler: async (ctx, { itemId, brandingType }) => {
    await ctx.db.patch(itemId, { brandingType })
  },
})

export const updateOrderItemCuttingBrandingType = mutation({
  args: {
    itemId: v.id('productionOrderItems'),
    cuttingBrandingType: v.optional(v.array(v.union(
      v.literal('dtf'),
      v.literal('dtg'),
      v.literal('flok'),
      v.literal('embroidery'),
      v.literal('sublimation'),
    ))),
  },
  handler: async (ctx, { itemId, cuttingBrandingType }) => {
    await ctx.db.patch(itemId, { cuttingBrandingType })
  },
})

export const updateAllOrderItemsBrandingType = mutation({
  args: {
    productionOrderId: v.id('productionOrders'),
    brandingType: v.optional(v.array(v.union(
      v.literal('dtf'),
      v.literal('dtg'),
      v.literal('flok'),
      v.literal('embroidery'),
      v.literal('sublimation'),
    ))),
    cuttingBrandingType: v.optional(v.array(v.union(
      v.literal('dtf'),
      v.literal('dtg'),
      v.literal('flok'),
      v.literal('embroidery'),
      v.literal('sublimation'),
    ))),
  },
  handler: async (ctx, { productionOrderId, brandingType, cuttingBrandingType }) => {
    const items = await ctx.db
      .query('productionOrderItems')
      .withIndex('by_productionOrder', q => q.eq('productionOrderId', productionOrderId))
      .collect()
    await Promise.all(items.map(item => ctx.db.patch(item._id, { brandingType, cuttingBrandingType })))
  },
})

export const updateOrderItemComment = mutation({
  args: {
    itemId:  v.id('productionOrderItems'),
    comment: v.optional(v.string()),
  },
  handler: async (ctx, { itemId, comment }) => {
    await ctx.db.patch(itemId, { comment })
  },
})

export const creatreProductionTask = mutation({
  args: {
    externalData: v.any(),
    attachedFiles: v.optional(v.array(v.any())),
  },
  handler: async (ctx, args) => {
    const { externalData, attachedFiles } = args;
    const keycrmOrderId = String(externalData.id);

    // 0. Guard against duplicates — but always sync attachedFiles onto the branding task
    const existing = await ctx.db
      .query('productionOrders')
      .withIndex('by_keycrmOrderId', q => q.eq('keycrmOrderId', keycrmOrderId))
      .first();
    if (existing) {
      if (attachedFiles?.length) {
        const existingBrandingTask = await ctx.db
          .query('brandingTasks')
          .withIndex('by_productionOrder', q => q.eq('productionOrderId', existing._id))
          .first();
        if (existingBrandingTask) {
          await ctx.db.patch(existingBrandingTask._id, { attachedFiles });
        }
      }
      return null;
    }

    // 1. Create productionOrder
    const plannedShipDate = externalData.shipping?.shipping_date_actual
      ? new Date(externalData.shipping.shipping_date_actual).getTime()
      : Date.now();

    const productionOrderId = await ctx.db.insert('productionOrders', {
      keycrmOrderId,
      plannedShipDate,
      status: 'active',
      startDate: Date.now(),
      keycrmData: externalData,
      keycrmManager: externalData?.manager?.full_name ?? '-',
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
      const productSkuPrefix = product.sku ? String(product.sku).split('-')[0] : '';
      const productDoc = await ctx.db.query('products').withIndex('search_sku', q => q.eq('sku', product.sku)).first();

      const spec = await ctx.db.query('specifications').withIndex('search_skuPrefix', q => q.eq('skuPrefix', productSkuPrefix)).first();
      let processingType: 'branding' | 'embroidery' | 'silkscreen' | 'none' = 'none';
      if (product.product_status_id != null) {
        const mapping = await ctx.db
          .query('productStatusMappings')
          .withIndex('by_keycrmStatusId', q => q.eq('keycrmStatusId', product.product_status_id))
          .first();
        if (mapping) processingType = mapping.processingType;
      }
      console.log(product.sku, productDoc?.color, color, productDoc?.color ?? color)
      console.log(product.sku, productDoc?.size, size, productDoc?.size ?? size)
      const shipmentType = product.shipment_type as 'manufacturing' | 'warehouse';
      const needsCutting = shipmentType === 'manufacturing';

      const itemId = await ctx.db.insert('productionOrderItems', {
        productionOrderId,
        keycrmOrderId,
        keycrmProductId: product.offer.product_id,
        name: spec?.name ?? product?.name,
        sku: product?.sku ?? '',
        color: productDoc?.color ?? color,
        size: productDoc?.size ?? size,
        quantity: product.quantity,
        keycrmProductComment: product.comment ?? '',
        shipmentType,
        keycrmProductStatusId: product.product_status_id ?? null,
        processingType,
        needsCutting,
        needsSewing:        needsCutting,
        needsBranding:      true,
        needsSubcontractor: processingType === 'embroidery' || processingType === 'silkscreen',
        needsPackaging:     true,
      });

      orderItems.push({
        id: itemId as unknown as string,
        product,
        needsCutting,
        size: productDoc?.size ?? size,
        color: productDoc?.color ?? color,
      });
    }

    // 4. Create cutting tasks for manufacturing items
    const cuttingTaskIds = await createCuttingTasks(ctx, { productionOrderId, plannedShipDate, keycrmOrderId, orderItems });

    // 5. Create sewing tasks + sub-tasks (mirroring cutting task structure)
    await createSewingTasks(ctx, { productionOrderId, plannedShipDate, keycrmOrderId, orderItems, cuttingTaskIds });

    // 6. Create branding task for the order
    await createBrandingTasks(ctx, { productionOrderId, keycrmOrderId, plannedShipDate, externalData, attachedFiles });

    return { productionOrderId };
  },
})
