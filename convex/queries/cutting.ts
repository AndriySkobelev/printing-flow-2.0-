import { v } from 'convex/values'
import { query, mutation, type QueryCtx } from '../_generated/server'
import { type Id } from '../_generated/dataModel'
import { omit } from 'ramda'
import { getAuthUserId } from '@convex-dev/auth/server'

// ─── HELPERS ────────────────────────────────────────────────────────────────

async function resolveSpecForOrder(ctx: QueryCtx, productionOrderId: Id<'productionOrders'>) {
  const orderItems = await ctx.db
    .query('productionOrderItems')
    .withIndex('by_productionOrder', q => q.eq('productionOrderId', productionOrderId))
    .collect();

  const skus = [...new Set(orderItems.map((i: any) => i.sku as string))];

  const parentIds = new Set<string>();
  for (const sku of skus) {
    const product = await ctx.db
      .query('products')
      .withIndex('search_sku', q => q.eq('sku', sku))
      .first();
    if (product?.parentId) parentIds.add(product.parentId as string);
  }

  const rawSpecs = await Promise.all([...parentIds].map(id => ctx.db.get(id as Id<'specifications'>)));
  const specs = rawSpecs.filter(Boolean);

  const resolved = await Promise.all(
    specs.map(async (spec: any) => {
      const materials = await Promise.all(
        spec.materials.map(async (mat: any) => {
          let name: string | undefined = mat.materialName;
          if (!name) {
            if (mat.fabricId) {
              const fabric = await ctx.db.get(mat.fabricId as Id<'fabrics'>);
              name = fabric?.name;
            } else if (mat.materialId) {
              const material = await ctx.db.get(mat.materialId as Id<'materials'>);
              name = material?.name;
            }
          }
          return { ...mat, materialName: name };
        })
      );
      return { ...omit(['productionPrice'], spec), materials };
    })
  );

  return resolved[0] ?? null;
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

        const spec = await resolveSpecForOrder(ctx, task.productionOrderId);
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