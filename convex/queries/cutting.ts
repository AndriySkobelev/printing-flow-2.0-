import { v } from 'convex/values'
import { query, mutation, type QueryCtx } from '../_generated/server'
import { type Id } from '../_generated/dataModel'
import { omit } from 'ramda'
import { getAuthUserId } from '@convex-dev/auth/server'
import { resolveMaterialParent } from './specifications'
import { consumeItemReservations } from './movements'

// ─── HELPERS ────────────────────────────────────────────────────────────────

// Resolves the spec for one specific cutting task, via any of its own items
// (a cutting task groups items by name+color, so they all share one spec) —
// not by scanning every item in the whole production order, which could span
// several different products/specs and would return an arbitrary one.
async function resolveSpecForCuttingTask(ctx: QueryCtx, sizes: Array<{ productionOrderItemId: Id<'productionOrderItems'> }>) {
  const firstSize = sizes[0];
  if (!firstSize) return null;

  const item = await ctx.db.get(firstSize.productionOrderItemId);
  if (!item?.sku) return null;

  const product = await ctx.db
    .query('products')
    .withIndex('search_sku', q => q.eq('sku', item.sku))
    .first();
  if (!product?.parentId) return null;

  const spec = await ctx.db.get(product.parentId);
  if (!spec) return null;

  const materials = await Promise.all(
    spec.materials.map(async (mat: any) => {
      const resolved = await resolveMaterialParent(ctx, mat);
      return { ...mat, materialName: resolved.name };
    })
  );
  return { ...omit(['productionPrice'], spec), materials };
}

// ─── QUERIES ────────────────────────────────────────────────────────────────

export const getAllCuttingTasks = query({
  args: {},
  handler: async (ctx) => {
    const tasks = await ctx.db.query('cuttingTasks').collect();

    const enriched = await Promise.all(
      tasks.map(async task => {
        const sizes = await ctx.db
          .query('cuttingTaskSizes')
          .withIndex('by_cuttingTask', q => q.eq('cuttingTaskId', task._id))
          .collect();

        const sizesMap: Record<string, number> = {};
        for (const s of sizes) {
          sizesMap[s.size] = s.quantity;
        }

        const spec = await resolveSpecForCuttingTask(ctx, sizes);
        const productionOrder = await ctx.db.get(task.productionOrderId);
        const fabricColor = await ctx.db
          .query('fabricColors')
          .filter(q => q.eq(q.field('name'), task.color))
          .first();

        const allLogs = await ctx.db
          .query('productionOrderLogs')
          .withIndex('by_productionOrder', q => q.eq('productionOrderId', task.productionOrderId))
          .collect()

        const relevantLogs = allLogs.filter(log =>
          log.type === 'created' ||
          log.type === 'deleted' ||
          (log.type === 'updated' && log.changes && 'quantity' in (log.changes as Record<string, unknown>))
        )
        const relevantLogsCount = relevantLogs.length
        const unseenLogsCount   = relevantLogs.filter(log => !log.shownToUserId).length

        // latest unseen quantity-change log per item
        const unseenQtyChanges = new Map<string, { logId: string; oldQty: number; timestamp: number }>()
        for (const log of allLogs) {
          if (
            log.type === 'updated' &&
            !log.shownToUserId &&
            log.productionOrderItemId &&
            log.changes &&
            'quantity' in (log.changes as Record<string, unknown>)
          ) {
            const key = String(log.productionOrderItemId)
            const cur = unseenQtyChanges.get(key)
            if (!cur || log.timestamp > cur.timestamp) {
              unseenQtyChanges.set(key, {
                logId:     log._id,
                oldQty:    (log.changes as any).quantity.from,
                timestamp: log.timestamp,
              })
            }
          }
        }

        const sizesWithChanges = sizes.map(s => ({
          ...s,
          quantityChange: unseenQtyChanges.get(String(s.productionOrderItemId)) ?? null,
        }))

        return {
          ...task,
          spec,
          sizes: sizesWithChanges,
          sizesMap,
          fabricColorHex: fabricColor?.hex ?? null,
          labelColorHex: fabricColor?.labelHex ?? null,
          keycrmManager: productionOrder?.keycrmManager ?? null,
          relevantLogsCount,
          unseenLogsCount,
        };
      })
    );

    return enriched.sort((a, b) => (a.endDate ?? 0) - (b.endDate ?? 0));
  },
});

export const getCuttingTasksByOrder = query({
  args: { productionOrderId: v.id('productionOrders') },
  handler: async (ctx, args) => {
    const tasks = await ctx.db
      .query('cuttingTasks')
      .withIndex('by_productionOrder', q => q.eq('productionOrderId', args.productionOrderId))
      .collect();

    return Promise.all(
      tasks.map(async task => {
        const sizes = await ctx.db
          .query('cuttingTaskSizes')
          .withIndex('by_cuttingTask', q => q.eq('cuttingTaskId', task._id))
          .collect();
        return { ...task, sizes };
      })
    );
  },
});

export const getCuttingTaskById = query({
  args: { cuttingTaskId: v.id('cuttingTasks') },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.cuttingTaskId);
    if (!task) return null;

    const sizes = await ctx.db
      .query('cuttingTaskSizes')
      .withIndex('by_cuttingTask', q => q.eq('cuttingTaskId', args.cuttingTaskId))
      .collect();

    return { ...task, sizes };
  },
});

// ─── MUTATIONS ───────────────────────────────────────────────────────────────

export const updateCuttingTaskPlanedEndDate = mutation({
  args: {
    cuttingTaskId: v.id('cuttingTasks'),
    planedEndDate: v.optional(v.number()),
  },
  handler: async (ctx, { cuttingTaskId, planedEndDate }) => {
    await ctx.db.patch(cuttingTaskId, { planedEndDate })
  },
})

export const updateCuttingTaskStatus = mutation({
  args: {
    cuttingTaskId: v.id('cuttingTasks'),
    status: v.union(
      v.literal('new'),
      v.literal('in_progress'),
      v.literal('done'),
      v.literal('paused'),
      v.literal('waiting'),
    ),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { cuttingTaskId, status, note } = args;
    await ctx.db.patch(cuttingTaskId, { status, ...(note !== undefined && { note }) });
  },
});

export const addCuttingTaskSizeLog = mutation({
  args: {
    cuttingTaskSizeId: v.id('cuttingTaskSizes'),
    quantity: v.number(),
    comment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { cuttingTaskSizeId, quantity, comment } = args;

    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Not authenticated');

    const existing = await ctx.db.get(cuttingTaskSizeId);
    if (!existing) throw new Error('cuttingTaskSize not found');

    const newLog = { quantity, timestamp: Date.now(), userId, comment };
    const logs = [...(existing.logs ?? []), newLog];

    await ctx.db.patch(cuttingTaskSizeId, {
      completedQty: existing.completedQty + quantity,
      logs,
    });

    // This much of the item's total quantity was just cut — release that
    // same fraction of its reserved fabric into actual consumption. Other
    // material types (zippers, labels, etc.) aren't consumed at cutting.
    if (existing.quantity > 0) {
      const productionOrderItem = await ctx.db.get(existing.productionOrderItemId);
      const productionOrder = productionOrderItem ? await ctx.db.get(productionOrderItem.productionOrderId) : null;

      const orderId = productionOrder?.keycrmOrderId ? Number(productionOrder.keycrmOrderId) : undefined;

      await consumeItemReservations(ctx, {
        productionOrderItemId: existing.productionOrderItemId,
        fraction: quantity / existing.quantity,
        manager: productionOrder?.keycrmManager,
        materialTypes: ['fabricVariants'],
        orderId: orderId !== undefined && !Number.isNaN(orderId) ? orderId : undefined,
        productQuantity: quantity,
        userId,
      });
    }
  },
});

export const assignCuttingTask = mutation({
  args: {
    cuttingTaskId: v.id('cuttingTasks'),
    assignedTo: v.id('users'),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.cuttingTaskId, { assignedTo: args.assignedTo });
  },
});