import { v } from 'convex/values'
import { query, mutation } from '../_generated/server'
import { type Id } from '../_generated/dataModel'
import { getAuthUserId } from '@convex-dev/auth/server'
import { advanceOrderToInProgress } from './orders'

// ─── QUERIES ────────────────────────────────────────────────────────────────

export const getAllPackagingTasks = query({
  args: {},
  handler: async (ctx) => {
    const tasks = await ctx.db.query('packagingTasks').collect();

    const enriched = await Promise.all(
      tasks.map(async (task) => {
        const productionOrder = await ctx.db.get(task.productionOrderId);

        const orderItems = await ctx.db
          .query('productionOrderItems')
          .withIndex('by_productionOrder', q => q.eq('productionOrderId', task.productionOrderId))
          .collect();
        const itemsById = new Map(orderItems.map(item => [item._id, item]));

        const brandingTypes = [...new Set(
          orderItems.flatMap(item => [...(item.brandingType ?? []), ...(item.cuttingBrandingType ?? [])])
        )];

        const subcontractorTasks = (await ctx.db
          .query('subcontractorTasks')
          .withIndex('by_productionOrder', q => q.eq('productionOrderId', task.productionOrderId))
          .collect()).map(st => ({
            _id:                 st._id,
            name:                st.name,
            type:                st.type,
            status:              st.status,
            expectedSentDate:    st.expectedSentDate,
            expectedReturnDate:  st.expectedReturnDate,
            actualSentDate:      st.actualSentDate   ?? null,
            actualReturnDate:    st.actualReturnDate ?? null,
          }));

        const sewingTasks = await ctx.db
          .query('sewingTasks')
          .withIndex('by_productionOrder', q => q.eq('productionOrderId', task.productionOrderId))
          .collect();
        const sewingSubTasks = (await Promise.all(
          sewingTasks.map(sewingTask => ctx.db
            .query('sewingSubTasks')
            .withIndex('by_sewingTask', q => q.eq('sewingTaskId', sewingTask._id))
            .collect())
        )).flat();

        const subTasks = await Promise.all(
          sewingSubTasks.map(async (subTask) => {
            const item = subTask.productionOrderItemId ? itemsById.get(subTask.productionOrderItemId) ?? null : null;
            const user = subTask.assignedTo ? await ctx.db.get(subTask.assignedTo) : null;

            return {
              _id:                   subTask._id,
              productionOrderItemId: subTask.productionOrderItemId ?? null,
              itemName:              item?.name  ?? null,
              color:                 item?.color ?? null,
              size:                  item?.size  ?? subTask.size ?? null,
              quantity:              subTask.quantity,
              status:                subTask.status,
              endDate:               subTask.endDate ?? null,
              isCustomCut:           item?.isCustomCut ?? false,
              isCustomSewing:        subTask.isCustomSewing      ?? item?.isCustomSewing      ?? false,
              customCutComment:      item?.customCutComment      ?? undefined,
              customSewingComment:   subTask.customSewingComment ?? item?.customSewingComment ?? undefined,
              assignedTo: user ? {
                name:     user.name     ?? null,
                lastName: user.lastName ?? null,
                image:    user.image    ?? null,
              } : null,
            };
          })
        );

        const logs = await ctx.db
          .query('packagingLogs')
          .withIndex('by_packagingTask', q => q.eq('packagingTaskId', task._id))
          .collect();

        return {
          ...task,
          keycrmManager:   productionOrder?.keycrmManager   ?? null,
          plannedShipDate: productionOrder?.plannedShipDate ?? null,
          attachedFiles:   productionOrder?.attachedFiles   ?? [],
          brandingTypes,
          subcontractorTasks,
          subTasks,
          logs,
        };
      })
    );

    return enriched.sort((a, b) => (a.endDate ?? 0) - (b.endDate ?? 0));
  },
});

// ─── MUTATIONS ──────────────────────────────────────────────────────────────

export const createPackagingLog = mutation({
  args: {
    packagingTaskId: v.id('packagingTasks'),
    productionOrderItemId: v.id('productionOrderItems'),
    type: v.union(
      v.literal('completed'),
      v.literal('defect_fabric'),
      v.literal('defect_print'),
      v.literal('defect_sewing'),
    ),
    quantity: v.number(),
    comment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Not authenticated');

    const { packagingTaskId, productionOrderItemId, type, quantity, comment } = args;

    const packagingTask = await ctx.db.get(packagingTaskId);
    if (packagingTask) await advanceOrderToInProgress(ctx, packagingTask.productionOrderId);

    return ctx.db.insert('packagingLogs', {
      packagingTaskId,
      productionOrderItemId,
      userId: userId as Id<'users'>,
      type,
      quantity,
      timestamp: Date.now(),
      ...(comment !== undefined && { comment }),
    });
  },
});

export const updatePackagingTaskStatus = mutation({
  args: {
    packagingTaskId: v.id('packagingTasks'),
    status: v.union(
      v.literal('new'),
      v.literal('in_progress'),
      v.literal('done'),
      v.literal('paused'),
      v.literal('waiting'),
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.packagingTaskId, { status: args.status });
  },
});
