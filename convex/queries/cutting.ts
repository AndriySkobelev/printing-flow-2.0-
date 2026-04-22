import { v } from 'convex/values'
import { query, mutation } from '../_generated/server'
import { getAuthUserId } from '@convex-dev/auth/server'

// ─── QUERIES ────────────────────────────────────────────────────────────────

export const getAllCuttingTasks = query({
  args: {},
  handler: async (ctx) => {
    const tasks = await ctx.db.query('cuttingTasks').collect();

    return Promise.all(
      tasks.map(async task => {
        const sizes = await ctx.db
          .query('cuttingTaskSizes')
          .withIndex('by_cuttingTask', q => q.eq('cuttingTaskId', task._id))
          .collect();

        // Shape sizes as { S: 6, M: 9, ... } for easy table rendering
        const sizesMap: Record<string, number> = {};
        for (const s of sizes) {
          sizesMap[s.size] = s.quantity;
        }

        return {
          ...task,
          sizesMap,
          sizes,
        };
      })
    );
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

export const updateCuttingTaskStatus = mutation({
  args: {
    cuttingTaskId: v.id('cuttingTasks'),
    status: v.union(
      v.literal('new'),
      v.literal('in_progress'),
      v.literal('done'),
      v.literal('delayed')
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