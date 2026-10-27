import { v } from 'convex/values'
import { query, mutation, type QueryCtx } from '../_generated/server'
import { type Id } from '../_generated/dataModel'
import { omit } from 'ramda'
import { getAuthUserId } from '@convex-dev/auth/server'
import { resolveMaterialParent } from './specifications'
import { consumeItemReservations } from './movements'
import { advanceOrderToInProgress } from './orders'
import { getBaseSpecLines, getEffectiveSpecLines, resolveSpecLineVariant, type SpecLine } from './orderItemSpec'

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
          .withIndex('by_name', q => q.eq('name', task.color))
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

        // Per-size custom-cut flag comes from the linked productionOrderItem —
        // no separate field needed on cuttingTaskSizes itself.
        const sizesWithChanges = await Promise.all(sizes.map(async s => {
          const item = await ctx.db.get(s.productionOrderItemId)
          return {
            ...s,
            quantityChange:   unseenQtyChanges.get(String(s.productionOrderItemId)) ?? null,
            isCustomCut:      item?.isCustomCut ?? false,
            customCutComment: item?.customCutComment ?? null,
            hasCustomSpec:    !!item?.specMaterials,
          }
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

// A cutting task's spec elements per size: each item's effective lines (its
// own edited copy, else spec + product assignments — see orderItemSpec.ts),
// sizes with identical lines grouped, and every line marked against the base
// spec: added / changed (variant or quantity) / removed / same.
export const getCuttingTaskSpecDetails = query({
  args: { cuttingTaskId: v.id('cuttingTasks') },
  handler: async (ctx, { cuttingTaskId }) => {
    const sizes = await ctx.db
      .query('cuttingTaskSizes')
      .withIndex('by_cuttingTask', q => q.eq('cuttingTaskId', cuttingTaskId))
      .collect();

    const groups = new Map<string, { sizes: Array<string>, lines: Array<SpecLine>, base: Array<SpecLine> }>();

    for (const s of sizes) {
      const item = await ctx.db.get(s.productionOrderItemId);
      if (!item) continue;
      const effective = await getEffectiveSpecLines(ctx, item);
      if (!effective) continue;

      const key = JSON.stringify(effective.lines.map(l => [l.lineId, l.id, l.quantity]));
      const group = groups.get(key);
      if (group) {
        group.sizes.push(s.size);
      } else {
        const base = effective.isCustom ? (await getBaseSpecLines(ctx, item) ?? []) : effective.lines;
        groups.set(key, { sizes: [s.size], lines: effective.lines, base });
      }
    }

    const toRow = async (line: SpecLine, status: 'same' | 'added' | 'changed' | 'removed') => {
      const { materialName, color, units } = await resolveSpecLineVariant(ctx, line);
      return { lineId: line.lineId, name: line.name || materialName || '—', materialName, color, quantity: line.quantity, units, status };
    };

    return Promise.all([...groups.values()].map(async ({ sizes, lines, base }) => {
      const current = await Promise.all(lines.map((line) => {
        const baseLine = base.find(b => b.lineId === line.lineId);
        const status = !baseLine
          ? 'added' as const
          : baseLine.id !== line.id || Math.abs(baseLine.quantity - line.quantity) > 0.0001
            ? 'changed' as const
            : 'same' as const;
        return toRow(line, status);
      }));
      const removed = await Promise.all(base
        .filter(b => !lines.some(l => l.lineId === b.lineId))
        .map(b => toRow(b, 'removed')));
      return { sizes, lines: [...current, ...removed] };
    }));
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

    const cutItem = await ctx.db.get(existing.productionOrderItemId);
    if (cutItem) await advanceOrderToInProgress(ctx, cutItem.productionOrderId);

    const newLog = { quantity, timestamp: Date.now(), userId, comment };
    const logs = [...(existing.logs ?? []), newLog];

    const newCompletedQty = existing.completedQty + quantity;

    await ctx.db.patch(cuttingTaskSizeId, {
      completedQty: newCompletedQty,
      logs,
    });

    // Cut more of this size than was planned (e.g. extra fabric allowed for
    // waste, or the plan undercounted). Only the newly-crossed overrun from
    // this log gets its own subSewingTask — not the whole overrun again on
    // every later log — so sewers get exactly the extra pieces to sew.
    const overrunBefore = Math.max(0, existing.completedQty - existing.quantity);
    const overrunAfter  = Math.max(0, newCompletedQty - existing.quantity);
    const extraQty = overrunAfter - overrunBefore;

    if (extraQty > 0) {
      const sewingTask = await ctx.db
        .query('sewingTasks')
        .withIndex('by_cuttingTask', q => q.eq('cuttingTaskId', existing.cuttingTaskId))
        .first();

      if (sewingTask) {
        await ctx.db.insert('sewingSubTasks', {
          sewingTaskId: sewingTask._id,
          productionOrderItemId: existing.productionOrderItemId,
          size: existing.size,
          quantity: extraQty,
          completedQty: 0,
          status: 'new',
        });
      }
    }

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