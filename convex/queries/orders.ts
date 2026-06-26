import { v } from 'convex/values'
import { query, mutation, action } from '../_generated/server'
import type { MutationCtx } from '../_generated/server'
import type { Id } from '../_generated/dataModel'
import { api } from '../_generated/api'
import { getAuthUserId } from '@convex-dev/auth/server'
import { omit } from 'ramda'

type Diff = Record<string, { from: any; to: any }>

const computeDiff = (before: Record<string, any>, after: Record<string, any>): Diff => {
  const diff: Diff = {}
  for (const key of Object.keys(after)) {
    if (JSON.stringify(before[key] ?? null) !== JSON.stringify(after[key] ?? null)) {
      diff[key] = { from: before[key] ?? null, to: after[key] ?? null }
    }
  }
  return diff
}

async function insertLog(ctx: MutationCtx, args: {
  productionOrderId: any
  keyCrmOrderId: string
  productionOrderItemId?: any
  type: 'split' | 'created' | 'deleted' | 'updated'
  changes?: Diff
}) {
  const userId = await getAuthUserId(ctx)
  if (!userId) return
  await ctx.db.insert('productionOrderLogs', { ...args, userId, timestamp: Date.now() })
}

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
  return fabric?.name ?? sku
}

type OrderItemEntry = {
  id: string;
  product: any;
  color: string;
  size: string;
  needsCutting: boolean;
  shipmentType: 'manufacturing' | 'warehouse' | null;
  isCustomCut?: boolean | null;
};

async function createCuttingTasks(ctx: MutationCtx, { productionOrderId, plannedShipDate, keycrmOrderId, orderItems }: {
  productionOrderId: any
  keycrmOrderId: string
  plannedShipDate: number,
  orderItems: OrderItemEntry[]
}): Promise<Map<string, string>> {
  const manufacturingItems = orderItems.filter(i => i.shipmentType === 'manufacturing')
  const customItems  = manufacturingItems.filter(i => i.isCustomCut)
  const normalItems  = manufacturingItems.filter(i => !i.isCustomCut)

  const cuttingGroups = new Map<string, OrderItemEntry[]>()
  for (const item of normalItems) {
    const key = `${item.product.name}__${item.color}`
    if (!cuttingGroups.has(key)) cuttingGroups.set(key, [])
    cuttingGroups.get(key)!.push(item)
  }

  const totalTasks = cuttingGroups.size + customItems.length
  let taskIndex = 1
  const groupToCuttingTaskId = new Map<string, string>()

  for (const [key, items] of cuttingGroups.entries()) {
    const { product, color } = items[0]
    const specName = product.name as string
    const fabric   = await resolveFabricName(ctx, items[0].product.sku as string)

    const cuttingTaskId = await ctx.db.insert('cuttingTasks', {
      color,
      fabric,
      specName,
      keycrmOrderId,
      status: 'new',
      productionOrderId,
      endDate: plannedShipDate,
      orderIndex: totalTasks === 1 ? keycrmOrderId : `${keycrmOrderId}-(${taskIndex++})`,
    })

    groupToCuttingTaskId.set(key, cuttingTaskId as unknown as string)

    for (const item of items) {
      await ctx.db.insert('cuttingTaskSizes', {
        cuttingTaskId,
        productionOrderItemId: item.id as any,
        size: item.size,
        quantity: item.product.quantity,
        completedQty: 0,
      })
    }
  }

  for (const item of customItems) {
    const fabric   = await resolveFabricName(ctx, item.product.sku as string)
    const dbItem   = await ctx.db.get(item.id as Id<'productionOrderItems'>)

    const cuttingTaskId = await ctx.db.insert('cuttingTasks', {
      color:     item.color,
      fabric,
      specName:  item.product.name as string,
      keycrmOrderId,
      status:    'new',
      productionOrderId,
      endDate:   plannedShipDate,
      isCustomCut:      true,
      customCutComment: dbItem?.customCutComment ?? undefined,
      orderIndex: totalTasks === 1 ? keycrmOrderId : `${keycrmOrderId}-(${taskIndex++})`,
    })

    groupToCuttingTaskId.set(item.id, cuttingTaskId as unknown as string)

    await ctx.db.insert('cuttingTaskSizes', {
      cuttingTaskId,
      productionOrderItemId: item.id as any,
      size:         item.size,
      quantity:     item.product.quantity,
      completedQty: 0,
    })
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
  for (const item of orderItems.filter(i => i.shipmentType === 'manufacturing')) {
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

async function createBrandingTasks(ctx: MutationCtx, { productionOrderId, keycrmOrderId, plannedShipDate, externalData }: {
  productionOrderId: any
  keycrmOrderId: string
  plannedShipDate: number
  externalData: any
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
    manager:        externalData.manager?.full_name ?? undefined,
    identifierName: externalData.source_uuid        ?? undefined,
    tags:           tags.length ? tags : undefined,
  });
}

export const getAllProductionOrdersWithProgress = query({
  args: {
    search: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal('new'),
      v.literal('in_progress'),
      v.literal('dispatched'),
      v.literal('done'),
      v.literal('cancelled'),
    )),
  },
  handler: async (ctx, { search, status }) => {
    let orders = status
      ? await ctx.db.query('productionOrders').withIndex('by_status', q => q.eq('status', status)).collect()
      : await ctx.db.query('productionOrders').collect()

    if (search) {
      const s = search.toLowerCase()
      orders = orders.filter(o =>
        o.keycrmOrderId.toLowerCase().includes(s) ||
        o.keycrmManager.toLowerCase().includes(s)
      )
    }

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

      const customFields = (order.keycrmData?.custom_fields ?? []) as Array<{ uuid: string; name: string; value: unknown }>
      const indicator = customFields.find(f => f.uuid === 'OR_1010')?.value ?? null

      return {
        _id:             order._id,
        group:           `#${order.keycrmOrderId}`,
        keycrmOrderId:   order.keycrmOrderId,
        keycrmManager:   order.keycrmManager,
        plannedShipDate: order.plannedShipDate,
        indicator,
        totalQty,
        cutDone,      cutTotal,
        sewDone,      sewTotal,
        status: order.status,
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
      inProduction: order.inProduction ?? false,
      totalQty,
      cutDone,      cutTotal,
      sewDone,      sewTotal,
      brandingDone, brandingTotal,
      packingDone,  packingTotal,
      attachedFiles: order.attachedFiles ?? [],
      keycrmCustomFields: (order.keycrmData?.custom_fields ?? []) as Array<{ name: string; value: unknown }>,
      items: items.map(i => ({
        _id:                  i._id,
        name:                 i.name,
        sku:                  i.sku,
        color:                i.color,
        size:                 i.size,
        quantity:             i.quantity,
        keycrmProductComment: i.keycrmProductComment ?? null,
        brandingComment:      i.brandingComment ?? null,
        sewingComment:        i.sewingComment ?? null,
        shipmentType:         i.shipmentType,
        processingType:       i.processingType ?? null,
        brandingType:         i.brandingType ?? null,
        cuttingBrandingType:  i.cuttingBrandingType ?? null,
        destination:          i.destination ?? null,
        isCustomCut:          i.isCustomCut  ?? null,
        isCustomSewing:       i.isCustomSewing ?? null,
        customCutComment:     i.customCutComment ?? null,
        customSewingComment:  i.customSewingComment ?? null,
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
    brandingComment: v.optional(v.string()),
    sewingComment:   v.optional(v.string()),
  },
  handler: async (ctx, { productionOrderId, brandingType, cuttingBrandingType, brandingComment, sewingComment }) => {
    const items = await ctx.db
      .query('productionOrderItems')
      .withIndex('by_productionOrder', q => q.eq('productionOrderId', productionOrderId))
      .collect()
    await Promise.all(items.map(item => ctx.db.patch(item._id, { brandingType, cuttingBrandingType, brandingComment, sewingComment })))
  },
})

export const updateSelectedOrderItemsBrandingType = mutation({
  args: {
    itemIds: v.array(v.id('productionOrderItems')),
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
    brandingComment: v.optional(v.string()),
    sewingComment:   v.optional(v.string()),
  },
  handler: async (ctx, { itemIds, brandingType, cuttingBrandingType, brandingComment, sewingComment }) => {
    for (const id of itemIds) {
      await ctx.db.patch(id, { brandingType, cuttingBrandingType, brandingComment, sewingComment })
    }
  },
})

export const migrateCommentToBrandingComment = mutation({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db.query('productionOrderItems').collect()
    let migrated = 0
    for (const item of items) {
      const legacy = (item as any).comment
      if (legacy !== undefined) {
        await ctx.db.patch(item._id, {
          brandingComment: item.brandingComment ?? legacy,
          comment: undefined,
        } as any)
        migrated++
      }
    }
    return { migrated }
  },
})

export const updateOrderItemBrandingComment = mutation({
  args: {
    itemId:         v.id('productionOrderItems'),
    brandingComment: v.optional(v.string()),
  },
  handler: async (ctx, { itemId, brandingComment }) => {
    await ctx.db.patch(itemId, { brandingComment })
  },
})

export const updateOrderItemSewingComment = mutation({
  args: {
    itemId:        v.id('productionOrderItems'),
    sewingComment: v.optional(v.string()),
  },
  handler: async (ctx, { itemId, sewingComment }) => {
    await ctx.db.patch(itemId, { sewingComment })
  },
})

export const creatreProductionOrder = mutation({
  args: {
    externalData: v.any(),
    attachedFiles: v.optional(v.array(v.any())),
  },
  handler: async (ctx, args) => {
    const { externalData, attachedFiles } = args;
    const keycrmOrderId = String(externalData.id);

    // 0. Guard against duplicates — sync attachedFiles onto existing order
    const existing = await ctx.db
      .query('productionOrders')
      .withIndex('by_keycrmOrderId', q => q.eq('keycrmOrderId', keycrmOrderId))
      .first();
    if (existing) {
      if (attachedFiles?.length) {
        const existingFiles: any[] = existing.attachedFiles ?? []
        const existingUrls = new Set(existingFiles.map((f: any) => typeof f === 'string' ? f : f?.url))
        const newFiles = attachedFiles.filter((f: any) => {
          const url = typeof f === 'string' ? f : f?.url
          return url && !existingUrls.has(url)
        })
        if (newFiles.length > 0) {
          await ctx.db.patch(existing._id, { attachedFiles: [...existingFiles, ...newFiles] })
        }
      }
      return null;
    }

    // 1. Create productionOrder
    const plannedShipDate = externalData.shipping?.shipping_date_actual
      ? new Date(externalData.shipping.shipping_date_actual).getTime()
      : Date.now();

    const productionOrderId = await ctx.db.insert('productionOrders', {
      status: 'new',
      keycrmOrderId,
      plannedShipDate,
      startDate: Date.now(),
      keycrmData: externalData,
      keycrmManager: externalData?.manager?.full_name ?? '-',
      attachedFiles: attachedFiles?.length ? attachedFiles : undefined,
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
        id:           itemId as unknown as string,
        product,
        needsCutting,
        shipmentType,
        size:  productDoc?.size  ?? size,
        color: productDoc?.color ?? color,
      });
    }

    return { productionOrderId };
  },
})

export const createProductionTasks = mutation({
  args: { productionOrderId: v.id('productionOrders') },
  handler: async (ctx, { productionOrderId }) => {
    const order = await ctx.db.get(productionOrderId)
    if (!order) throw new Error('Order not found')

    const keycrmOrderId  = order.keycrmOrderId
    const plannedShipDate = order.plannedShipDate
    const externalData   = order.keycrmData ?? {}

    const dbItems = await ctx.db
      .query('productionOrderItems')
      .withIndex('by_productionOrder', q => q.eq('productionOrderId', productionOrderId))
      .collect()

    const orderItems: OrderItemEntry[] = dbItems.map(item => ({
      id:           item._id as unknown as string,
      product:      { quantity: item.quantity, sku: item.sku, name: item.name },
      color:        item.color,
      size:         item.size,
      needsCutting: item.needsCutting ?? false,
      shipmentType: item.shipmentType,
      isCustomCut:      item.isCustomCut ?? false,
      customCutComment: item.customCutComment ?? undefined,
    }))

    const cuttingTaskIds = await createCuttingTasks(ctx, { productionOrderId, plannedShipDate, keycrmOrderId, orderItems })
    await createSewingTasks(ctx, { productionOrderId, plannedShipDate, keycrmOrderId, orderItems, cuttingTaskIds })

    const BRANDING_TYPES = new Set(['dtf', 'flok'])
    const needsBranding = dbItems.some(item => {
      const types = [...(item.brandingType ?? []), ...(item.cuttingBrandingType ?? [])]
      return types.some(t => BRANDING_TYPES.has(t))
    })
    if (needsBranding) {
      await createBrandingTasks(ctx, { productionOrderId, keycrmOrderId, plannedShipDate, externalData })
    }

    await Promise.all([
      ctx.db.patch(productionOrderId, { inProduction: true, status: 'in_progress' }),
      ...dbItems.map(item => ctx.db.patch(item._id, { inProduction: true })),
    ])

    await ctx.scheduler.runAfter(0, api.queries.orders.exportOrderToSheet, { productionOrderId })
  },
})

const SIZES = ['4XS', '3XS', 'XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL']

const buildSheetRows = (
  order: { keycrmOrderId: string; plannedShipDate: number; totalQty: number },
  items: Array<{
    name: string; color: string; size: string; quantity: number
    keycrmProductComment?: string | null
    sewingComment?: string | null
    brandingType?: string[] | null
    brandingComment?: string | null
    cuttingBrandingType?: string[] | null
  }>
): string[][] => {
  const groups = new Map<string, typeof items>()
  for (const item of items) {
    const key = `${item.name}__${item.color}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(item)
  }
  const dateStr = new Date(order.plannedShipDate).toLocaleDateString('uk-UA', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
  const allGroups = Array.from(groups.values())
  return allGroups.map((groupItems, index) => {
    const first = groupItems[0]
    const sizeMap: Record<string, number> = {}
    for (const item of groupItems) sizeMap[item.size] = item.quantity
    const groupTotal = groupItems.reduce((s, i) => s + i.quantity, 0)
    const orderId = allGroups.length > 1 ? `${order.keycrmOrderId}-(${index + 1})` : order.keycrmOrderId
    return [
      orderId, dateStr, '', first.name, '-', first.color,
      ...SIZES.map(s => String(sizeMap[s] ?? '')),
      String(groupTotal),
      first.keycrmProductComment ?? '',
      first.sewingComment ?? '',
      String(order.totalQty),
      String(first.brandingType?.length ?? ''),
      first.brandingComment ?? '',
      first.cuttingBrandingType?.join(', ') ?? '',
      '',
    ]
  })
}

export const exportOrderToSheet = action({
  args: { productionOrderId: v.id('productionOrders') },
  handler: async (ctx, { productionOrderId }) => {
    const order = await ctx.runQuery(api.queries.orders.getProductionOrderDetails, { productionOrderId })
    if (!order) return
    const rows = buildSheetRows(order, order.items as any[])
    await ctx.runAction(api.http_actions.googleSheets.backupToSheet, { rows })
  },
})

export const getSubcontractorTasksByOrder = query({
  args: { productionOrderId: v.id('productionOrders') },
  handler: async (ctx, { productionOrderId }) => {
    const tasks = await ctx.db
      .query('subcontractorTasks')
      .withIndex('by_productionOrder', q => q.eq('productionOrderId', productionOrderId))
      .collect()
    return Promise.all(tasks.map(async task => {
      const user = await ctx.db.get(task.userId)
      return { ...task, userName: user ? `${user.name ?? ''}`.trim() : '' }
    }))
  },
})

export const createSubcontractorTask = mutation({
  args: {
    productionOrderId:  v.id('productionOrders'),
    name:               v.string(),
    type:               v.union(v.literal('sublimation'), v.literal('embroidery'), v.literal('silkscreen'), v.literal('dtg'), v.literal('dtf'), v.literal('other')),
    quantity:           v.optional(v.number()),
    expectedSentDate:   v.optional(v.number()),
    actualSentDate:     v.optional(v.number()),
    expectedReturnDate: v.number(),
    status:             v.union(v.literal('sent'), v.literal('in_progress'), v.literal('returned'), v.literal('delayed'), v.literal('waiting_to_sent')),
    note:               v.optional(v.string()),
  },
  handler: async (ctx, { productionOrderId, name, type, quantity, expectedSentDate, actualSentDate, expectedReturnDate, status, note }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Not authenticated')
    const order = await ctx.db.get(productionOrderId)
    return ctx.db.insert('subcontractorTasks', {
      productionOrderId,
      keycrmOrderId: order?.keycrmOrderId,
      userId,
      name,
      type,
      quantity,
      expectedSentDate: expectedSentDate ?? Date.now(),
      actualSentDate,
      expectedReturnDate,
      status,
      note,
    })
  },
})

export const deleteSubcontractorTask = mutation({
  args: { taskId: v.id('subcontractorTasks') },
  handler: async (ctx, { taskId }) => {
    await ctx.db.delete(taskId)
  },
})

export const updateSubcontractorTaskStatus = mutation({
  args: {
    taskId: v.id('subcontractorTasks'),
    status: v.union(
      v.literal('sent'),
      v.literal('in_progress'),
      v.literal('returned'),
      v.literal('delayed'),
      v.literal('waiting_to_sent'),
    ),
  },
  handler: async (ctx, { taskId, status }) => {
    await ctx.db.patch(taskId, { status })
  },
})

export const updateSubcontractorTaskActualDates = mutation({
  args: {
    taskId:           v.id('subcontractorTasks'),
    actualSentDate:   v.optional(v.number()),
    actualReturnDate: v.optional(v.union(v.number(), v.null())),
  },
  handler: async (ctx, { taskId, actualSentDate, actualReturnDate }) => {
    await ctx.db.patch(taskId, {
      actualSentDate,
      actualReturnDate: actualReturnDate === null ? undefined : actualReturnDate,
    })
  },
})

export const splitOrderItem = mutation({
  args: {
    itemId:        v.id('productionOrderItems'),
    splitQuantity: v.number(),
  },
  handler: async (ctx, { itemId, splitQuantity }) => {
    const original = await ctx.db.get(itemId)
    if (!original) throw new Error('Item not found')
    if (splitQuantity < 1 || splitQuantity >= original.quantity)
      throw new Error('Invalid split quantity')

    const newKeycrmOrderId = original.keycrmOrderId
      ? `${original.keycrmOrderId}-1`
      : undefined

    await ctx.db.patch(itemId, { quantity: original.quantity - splitQuantity })

    await ctx.db.insert('productionOrderItems', {
      ...omit(['_id', '_creationTime'], original),
      quantity:      splitQuantity,
      keycrmOrderId: newKeycrmOrderId,
    })

    await insertLog(ctx, {
      productionOrderId:     original.productionOrderId,
      keyCrmOrderId:         original.keycrmOrderId ?? '',
      productionOrderItemId: itemId,
      type:    'split',
      changes: computeDiff(
        { quantity: original.quantity },
        { quantity: original.quantity - splitQuantity },
      ),
    })
  },
})

export const updateOrderItemDestination = mutation({
  args: {
    itemId:      v.id('productionOrderItems'),
    destination: v.union(v.literal('customer'), v.literal('warehouse'), v.literal('defects')),
  },
  handler: async (ctx, { itemId, destination }) => {
    const item = await ctx.db.get(itemId)
    if (!item) throw new Error('Item not found')
    await ctx.db.patch(itemId, { destination })
    await insertLog(ctx, {
      productionOrderId:     item.productionOrderId,
      keyCrmOrderId:         item.keycrmOrderId ?? '',
      productionOrderItemId: itemId,
      type:    'updated',
      changes: computeDiff(
        { destination: item.destination ?? null },
        { destination },
      ),
    })
  },
})

const brandingTypeValidator = v.array(v.union(
  v.literal('dtf'),
  v.literal('dtg'),
  v.literal('flok'),
  v.literal('embroidery'),
  v.literal('sublimation'),
))

export const updateOrderItem = mutation({
  args: {
    itemId:              v.id('productionOrderItems'),
    quantity:            v.number(),
    shipmentType:        v.union(v.literal('manufacturing'), v.literal('warehouse'), v.null()),
    brandingComment:     v.optional(v.nullable(v.string())),
    sewingComment:       v.optional(v.nullable(v.string())),
    brandingType:        v.optional(v.nullable(brandingTypeValidator)),
    cuttingBrandingType: v.optional(v.nullable(brandingTypeValidator)),
    destination:         v.optional(v.nullable(v.union(v.literal('customer'), v.literal('warehouse'), v.literal('defects')))),
    isCustomCut:         v.optional(v.boolean()),
    isCustomSewing:      v.optional(v.boolean()),
    customCutComment:    v.optional(v.string()),
    customSewingComment: v.optional(v.string()),
  },
  handler: async (ctx, { itemId, isCustomCut, isCustomSewing, customCutComment, customSewingComment, ...fields }) => {
    const item = await ctx.db.get(itemId)
    if (!item) throw new Error('Item not found')
    await ctx.db.patch(itemId, {
      ...fields,
      ...(isCustomCut   != null ? { isCustomCut }   : {}),
      ...(isCustomSewing != null ? { isCustomSewing } : {}),
      ...(customCutComment    != null ? { customCutComment }    : {}),
      ...(customSewingComment != null ? { customSewingComment } : {}),
    })

    if (fields.quantity !== item.quantity) {
      const cuttingSizes = await ctx.db
        .query('cuttingTaskSizes')
        .withIndex('by_productionOrderItem', q => q.eq('productionOrderItemId', itemId))
        .collect()
      await Promise.all(cuttingSizes.map(s => ctx.db.patch(s._id, { quantity: fields.quantity })))

      const sewingSubtasks = await ctx.db
        .query('sewingSubTasks')
        .withIndex('by_productionOrderItem', q => q.eq('productionOrderItemId', itemId))
        .collect()
      await Promise.all(sewingSubtasks.map(s => ctx.db.patch(s._id, { quantity: fields.quantity })))
    }

    const before = Object.fromEntries(Object.keys(fields).map(k => [k, (item as any)[k] ?? null]))
    await insertLog(ctx, {
      productionOrderId:     item.productionOrderId,
      keyCrmOrderId:         item.keycrmOrderId ?? '',
      productionOrderItemId: itemId,
      type:    'updated',
      changes: computeDiff(before, fields),
    })
  },
})

export const getOrderLogs = query({
  args: { productionOrderId: v.id('productionOrders') },
  handler: async (ctx, { productionOrderId }) => {
    const logs = await ctx.db
      .query('productionOrderLogs')
      .withIndex('by_productionOrder', q => q.eq('productionOrderId', productionOrderId))
      .order('desc')
      .collect()

    return Promise.all(logs.map(async log => {
      const user = await ctx.db.get(log.userId)
      const item = log.productionOrderItemId ? await ctx.db.get(log.productionOrderItemId) : null
      return {
        ...log,
        userName:  user?.name ?? '—',
        itemName:  item?.name  ?? null,
        itemColor: item?.color ?? null,
        itemSize:  item?.size  ?? null,
      }
    }))
  },
})

export const markOrderLogSeen = mutation({
  args: { logId: v.id('productionOrderLogs') },
  handler: async (ctx, { logId }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return
    await ctx.db.patch(logId, { shownToUserId: userId })
  },
})

export const addProductionOrderItems = mutation({
  args: {
    productionOrderId: v.id('productionOrders'),
    items: v.array(v.object({
      name:         v.string(),
      sku:          v.optional(v.string()),
      color:        v.string(),
      size:         v.string(),
      quantity:     v.number(),
      shipmentType: v.union(v.literal('manufacturing'), v.literal('warehouse')),
    })),
  },
  handler: async (ctx, { productionOrderId, items }) => {
    const order = await ctx.db.get(productionOrderId)
    if (!order) throw new Error('Order not found')

    for (const item of items) {
      const needsCutting = item.shipmentType === 'manufacturing'
      const materialProcessingType = item.sku ? await resolveMaterialProcessingType(ctx, item.sku) : null

      await ctx.db.insert('productionOrderItems', {
        productionOrderId,
        keycrmOrderId: order.keycrmOrderId,
        name:          item.name,
        sku:           item.sku ?? '',
        color:         item.color,
        size:          item.size,
        quantity:      item.quantity,
        shipmentType:  item.shipmentType,
        keycrmProductStatusId: null,
        materialProcessingType,
        needsCutting,
        needsSewing:    needsCutting,
        needsBranding:  true,
        needsPackaging: true,
      })
    }
  },
})

export const createManualProductionOrder = mutation({
  args: {
    keycrmOrderId: v.string(),
    keycrmManager: v.optional(v.string()),
    plannedShipDate: v.number(),
  },
  handler: async (ctx, { keycrmOrderId, keycrmManager, plannedShipDate }) => {
    const existing = await ctx.db
      .query('productionOrders')
      .withIndex('by_keycrmOrderId', q => q.eq('keycrmOrderId', keycrmOrderId))
      .first()
    if (existing) throw new Error(`Замовлення #${keycrmOrderId} вже існує`)

    return ctx.db.insert('productionOrders', {
      status: 'new',
      keycrmOrderId,
      keycrmManager: keycrmManager ?? '—',
      plannedShipDate,
      startDate: Date.now(),
    })
  },
})

export const generateOrderFileUploadUrl = mutation({
  args: {},
  handler: async (ctx) => ctx.storage.generateUploadUrl(),
})

export const addAttachedFile = mutation({
  args: {
    productionOrderId: v.id('productionOrders'),
    storageId:         v.string(),
    name:              v.string(),
    contentType:       v.optional(v.string()),
  },
  handler: async (ctx, { productionOrderId, storageId, name, contentType }) => {
    const url = await ctx.storage.getUrl(storageId as any)
    if (!url) throw new Error('File not found in storage')
    const order = await ctx.db.get(productionOrderId)
    if (!order) throw new Error('Order not found')
    const files = [...(order.attachedFiles ?? []), { url, name, contentType }]
    await ctx.db.patch(productionOrderId, { attachedFiles: files })
    return { url, name, contentType }
  },
})

export const deleteProductionOrder = mutation({
  args: { productionOrderId: v.id('productionOrders') },
  handler: async (ctx, { productionOrderId }) => {
    const items = await ctx.db
      .query('productionOrderItems')
      .withIndex('by_productionOrder', q => q.eq('productionOrderId', productionOrderId))
      .collect()
    await Promise.all(items.map(i => ctx.db.delete(i._id)))
    await ctx.db.delete(productionOrderId)
  },
})
