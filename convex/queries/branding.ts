import { v } from 'convex/values'
import { query, mutation } from '../_generated/server'
import { type Id } from '../_generated/dataModel'
import { getAuthUserId } from '@convex-dev/auth/server'

// ─── QUERIES ────────────────────────────────────────────────────────────────

export const getAllBrandingTasks = query({
  args: {},
  handler: async (ctx) => {
    const tasks = await ctx.db.query('brandingTasks').collect();

    const enriched = await Promise.all(
      tasks.map(async (task) => {
        const productionOrder = await ctx.db.get(task.productionOrderId);
        const orderItems = await ctx.db
          .query('productionOrderItems')
          .withIndex('by_productionOrder', q => q.eq('productionOrderId', task.productionOrderId))
          .collect();
        const logs = await ctx.db
          .query('brandingLogs')
          .withIndex('by_brandingTask', q => q.eq('brandingTaskId', task._id))
          .collect();

        return {
          ...task,
          keycrmManager: productionOrder?.keycrmManager ?? null,
          plannedShipDate: productionOrder?.plannedShipDate ?? null,
          orderItems,
          logs,
        };
      })
    );

    return enriched.sort((a, b) => (a.endDate ?? 0) - (b.endDate ?? 0));
  },
});

export const getBrandingTasksByOrder = query({
  args: { productionOrderId: v.id('productionOrders') },
  handler: async (ctx, args) => {
    const tasks = await ctx.db
      .query('brandingTasks')
      .withIndex('by_productionOrder', q => q.eq('productionOrderId', args.productionOrderId))
      .collect();

    return Promise.all(
      tasks.map(async (task) => {
        const orderItems = await ctx.db
          .query('productionOrderItems')
          .withIndex('by_productionOrder', q => q.eq('productionOrderId', task.productionOrderId))
          .collect();
        const logs = await ctx.db
          .query('brandingLogs')
          .withIndex('by_brandingTask', q => q.eq('brandingTaskId', task._id))
          .collect();

        return { ...task, orderItems, logs };
      })
    );
  },
});

export const getBrandingTaskById = query({
  args: { brandingTaskId: v.id('brandingTasks') },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.brandingTaskId);
    if (!task) return null;

    const productionOrder = await ctx.db.get(task.productionOrderId);
    const orderItems = await ctx.db
      .query('productionOrderItems')
      .withIndex('by_productionOrder', q => q.eq('productionOrderId', task.productionOrderId))
      .collect();
    const logs = await ctx.db
      .query('brandingLogs')
      .withIndex('by_brandingTask', q => q.eq('brandingTaskId', args.brandingTaskId))
      .collect();

    const logsWithUsers = await Promise.all(
      logs.map(async (log) => {
        const user = await ctx.db.get(log.userId);
        return { ...log, user: user ?? null };
      })
    );

    return {
      ...task,
      keycrmManager:   productionOrder?.keycrmManager   ?? null,
      plannedShipDate: productionOrder?.plannedShipDate ?? null,
      attachedFiles:   productionOrder?.attachedFiles   ?? [],
      orderItems,
      logs: logsWithUsers,
    };
  },
});

export const getBrandingLogsByTask = query({
  args: { brandingTaskId: v.id('brandingTasks') },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query('brandingLogs')
      .withIndex('by_brandingTask', q => q.eq('brandingTaskId', args.brandingTaskId))
      .collect();

    return Promise.all(
      logs.map(async (log) => {
        const user = await ctx.db.get(log.userId);
        const orderItem = await ctx.db.get(log.productionOrderItemId);
        return { ...log, user: user ?? null, orderItem: orderItem ?? null };
      })
    );
  },
});

// ─── MUTATIONS ───────────────────────────────────────────────────────────────

export const updateBrandingTaskStatus = mutation({
  args: {
    brandingTaskId: v.id('brandingTasks'),
    status: v.union(
      v.literal('new'),
      v.literal('in_progress'),
      v.literal('done'),
      v.literal('paused'),
      v.literal('waiting')
    ),
    note: v.optional(v.string()),
    shippedDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { brandingTaskId, status, note, shippedDate } = args;
    await ctx.db.patch(brandingTaskId, {
      status,
      ...(note !== undefined && { note }),
      ...(shippedDate !== undefined && { shippedDate }),
    });
  },
});

export const updateBrandingTask = mutation({
  args: {
    brandingTaskId: v.id('brandingTasks'),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    note: v.optional(v.string()),
    manager: v.optional(v.string()),
    shippedDate: v.optional(v.number()),
    identifierName: v.optional(v.string()),
    tags: v.optional(v.array(v.object({ name: v.string(), color: v.string() }))),
  },
  handler: async (ctx, args) => {
    const { brandingTaskId, ...fields } = args;
    const patch = Object.fromEntries(
      Object.entries(fields).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(brandingTaskId, patch);
  },
});

export const createBrandingLog = mutation({
  args: {
    brandingTaskId: v.id('brandingTasks'),
    productionOrderItemId: v.id('productionOrderItems'),
    type: v.union(
      v.literal('completed'),
      v.literal('defect_fabric'),
      v.literal('defect_print')
    ),
    quantity: v.number(),
    comment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Not authenticated');

    const { brandingTaskId, productionOrderItemId, type, quantity, comment } = args;

    const logId = await ctx.db.insert('brandingLogs', {
      brandingTaskId,
      productionOrderItemId,
      userId: userId as Id<'users'>,
      type,
      quantity,
      timestamp: Date.now(),
      ...(comment !== undefined && { comment }),
    });

    return logId;
  },
});

export const updateBrandingLog = mutation({
  args: {
    brandingLogId: v.id('brandingLogs'),
    type: v.optional(v.union(
      v.literal('completed'),
      v.literal('defect_fabric'),
      v.literal('defect_print')
    )),
    quantity: v.optional(v.number()),
    comment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { brandingLogId, ...fields } = args;
    const patch = Object.fromEntries(
      Object.entries(fields).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(brandingLogId, patch);
  },
});

export const deleteBrandingLog = mutation({
  args: {
    brandingLogId: v.id('brandingLogs'),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.brandingLogId);
  },
});
