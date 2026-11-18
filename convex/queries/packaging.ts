import { v } from 'convex/values'
import { query, mutation } from '../_generated/server'
import { type Id } from '../_generated/dataModel'
import { getAuthUserId } from '@convex-dev/auth/server'
import { advanceOrderToInProgress } from './orders'
import { resolveOrderText } from '../schemas/constants'
import { packingDayCapacity } from '../lib/packingDuration'
import { UTCDate } from '@date-fns/utc'
import { requirePage } from './roles'
import { workingCountByDay } from './sewerDaysOff'

const DAY_MS = 24 * 60 * 60 * 1000
const utcDayStart = (ms: number) => Math.floor(ms / DAY_MS) * DAY_MS

// Packing minutes of one sewing sub-task, sewn on `day`, to ship by `due`
// (both UTC midnight; `due` is Infinity when the order has no ship date).
type Chunk = { day: number; minutes: number; due: number }
type Day   = { day: number; capacity: number }

// From `fromDay` on, what doesn't fit a day's capacity moves on to the next
// day someone works. The earliest-due work fills the day first; work
// that would miss its ship date by moving stays, overloading the day — that's
// `overDue`. Earlier days stay as planned. With no capacity anywhere there's
// nowhere to move to, so nothing moves.
const spillOver = (days: Day[], chunks: Chunk[], fromDay: number) => {
  const planned = (day: number) => chunks.filter(c => c.day === day)
  const sum     = (list: Chunk[]) => list.reduce((total, c) => total + c.minutes, 0)
  if (!days.some(d => d.capacity > 0)) {
    return days.map(d => ({ ...d, minutes: sum(planned(d.day)), carried: 0, overDue: 0 }))
  }

  let pending: Chunk[] = []
  return days.map((d, i) => {
    if (d.day < fromDay) return { ...d, minutes: sum(planned(d.day)), carried: 0, overDue: 0 }
    const carried = sum(pending)
    const queue   = [...pending, ...planned(d.day)].sort((x, y) => x.due - y.due)
    const nextDay = days.slice(i + 1).find(n => n.capacity > 0)?.day ?? Infinity

    let free = d.capacity
    let overDue = 0
    pending = []
    for (const c of queue) {
      const fits = Math.min(c.minutes, free)
      free -= fits
      const rest = c.minutes - fits
      if (!rest) continue
      if (nextDay <= c.due) pending.push({ ...c, minutes: rest })
      else overDue += rest
    }
    return { ...d, minutes: d.capacity - free + overDue, carried, overDue }
  })
}

// ─── QUERIES ────────────────────────────────────────────────────────────────

// Minutes of packing still to do per day in `from`–`to` — each planned sewing
// sub-task is packed the day it's sewn (or, when the item's branding — not on
// cut pieces — goes to a subcontractor of that type, the day that comes back),
// by the spec's packing norm,
// less what's already packed — against what the packers working that day
// manage together; what doesn't fit a day moves on to the next one, unless
// that would miss the order's ship date.
export const getPackingLoadByDay = query({
  args: {
    from: v.number(),
    to:   v.number(),
  },
  handler: async (ctx, { from, to }) => {
    await requirePage(ctx, '/app/order-processing')
    // Overflow moves on from today, so a later range starts counting here.
    const today = utcDayStart(new UTCDate().valueOf())
    const start = Math.min(utcDayStart(from), today)
    const end   = utcDayStart(to)

    const sewnInWindow = await ctx.db
      .query('sewingSubTasks')
      .withIndex('by_startDate', q => q.gte('startDate', start).lt('startDate', end + DAY_MS))
      .collect()

    // Day each order's subcontracts come back, by branding type — the latest one.
    const returnDays = new Map<string, Map<string, number>>()
    for (const sub of await ctx.db.query('subcontractorTasks').collect()) {
      const byType = returnDays.get(sub.productionOrderId) ?? new Map<string, number>()
      const day    = utcDayStart(sub.actualReturnDate ?? sub.expectedReturnDate)
      byType.set(sub.type, Math.max(byType.get(sub.type) ?? 0, day))
      returnDays.set(sub.productionOrderId, byType)
    }

    // Sewn in the range, or back from a subcontractor in it.
    const returningItems = (await Promise.all(
      [...returnDays].filter(([, byType]) => [...byType.values()].some(day => day >= start && day <= end))
        .map(([orderId]) => ctx.db
          .query('productionOrderItems')
          .withIndex('by_productionOrder', q => q.eq('productionOrderId', orderId as Id<'productionOrders'>))
          .collect()),
    )).flat().map(item => item._id)
    const itemIds = [...new Set([
      ...sewnInWindow.flatMap(st => st.productionOrderItemId ? [st.productionOrderItemId] : []),
      ...returningItems,
    ])]

    const chunks: Chunk[] = []
    for (const itemId of itemIds) {
      const item    = await ctx.db.get(itemId)
      const order   = item ? await ctx.db.get(item.productionOrderId) : null
      const due     = order?.plannedShipDate ? utcDayStart(order.plannedShipDate) : Infinity
      const subcontractBack = Math.max(0, ...(item?.brandingType ?? [])
        .map(type => returnDays.get(item!.productionOrderId)?.get(type) ?? 0))
      const product = item?.productId ? await ctx.db.get(item.productId) : null
      const spec    = product ? await ctx.db.get(product.parentId) : null
      const norm    = Number(spec?.packingTime) || 0
      if (!norm) continue

      // What's packed so far counts against the earliest-sewn sub-tasks.
      let packed = (await ctx.db
        .query('packagingLogs')
        .withIndex('by_productionOrderItem', q => q.eq('productionOrderItemId', itemId))
        .collect())
        .filter(l => l.type === 'completed')
        .reduce((sum, l) => sum + l.quantity, 0)

      const subTasks = (await ctx.db
        .query('sewingSubTasks')
        .withIndex('by_productionOrderItem', q => q.eq('productionOrderItemId', itemId))
        .collect())
        .filter(st => st.startDate != null && st.destination !== 'defects')
        .sort((x, y) => x.startDate! - y.startDate!)

      for (const st of subTasks) {
        const left = Math.max(0, st.quantity - packed)
        packed     = Math.max(0, packed - st.quantity)
        const day  = Math.max(utcDayStart(st.startDate!), subcontractBack)
        if (!left || day < start || day > end) continue
        chunks.push({ day, minutes: left * norm, due })
      }
    }

    const packers = (await ctx.db.query('users').collect()).filter(u => u.role === 'packer')
    const days    = await workingCountByDay(ctx, packers.map(u => u._id), start, end)
    const capacity = days.map(({ day, working }) => ({ day, capacity: packingDayCapacity(working) }))
    return spillOver(capacity, chunks, today)
      .filter(d => d.day >= utcDayStart(from))
      .map(d => ({ ...d, minutes: Math.round(d.minutes), carried: Math.round(d.carried), overDue: Math.round(d.overDue) }))
  },
})

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
              hasCustomSpec:         !!item?.specMaterials,
              isCustomSewing:        subTask.isCustomSewing      ?? item?.isCustomSewing      ?? false,
              customCutComment:      item?.customCutComment      ?? undefined,
              customSewingComment:   subTask.customSewingComment ?? item?.customSewingComment ?? undefined,
              assignedTo: user ? {
                _id:      user._id,
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
          packaging:       resolveOrderText(productionOrder, 'packaging'),
          identifier:      resolveOrderText(productionOrder, 'identifier'),
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
