import { v } from 'convex/values'
import { query, mutation } from '../_generated/server'

// ─── QUERIES ────────────────────────────────────────────────────────────────

export const getOrderCuttingAndSewingProgress = query({
  args: { productionOrderId: v.id('productionOrders') },
  handler: async (ctx, args) => {
    // ── Cutting ──────────────────────────────────────────────────────────────
    const cuttingTasks = await ctx.db
      .query('cuttingTasks')
      .withIndex('by_productionOrder', q => q.eq('productionOrderId', args.productionOrderId))
      .collect()

    let cuttingTotal = 0
    let cuttingDone  = 0
    const cuttingLogs: Array<{ specName: string; color: string; size: string; quantity: number; timestamp: number }> = []

    for (const ct of cuttingTasks) {
      const sizes = await ctx.db
        .query('cuttingTaskSizes')
        .withIndex('by_cuttingTask', q => q.eq('cuttingTaskId', ct._id))
        .collect()
      for (const sz of sizes) {
        cuttingTotal += sz.quantity
        cuttingDone  += sz.completedQty
        for (const log of sz.logs ?? []) {
          cuttingLogs.push({ specName: ct.specName, color: ct.color, size: sz.size, quantity: log.quantity, timestamp: log.timestamp })
        }
      }
    }
    cuttingLogs.sort((a, b) => b.timestamp - a.timestamp)

    // ── Sewing ───────────────────────────────────────────────────────────────
    const sewingTasks = await ctx.db
      .query('sewingTasks')
      .withIndex('by_productionOrder', q => q.eq('productionOrderId', args.productionOrderId))
      .collect()

    let sewingTotal = 0
    let sewingDone  = 0
    const sewingLogs: Array<{ userName: string; size: string | null; quantity: number; type: string; timestamp: number }> = []

    for (const st of sewingTasks) {
      const subTasks = await ctx.db
        .query('sewingSubTasks')
        .withIndex('by_sewingTask', q => q.eq('sewingTaskId', st._id))
        .collect()

      for (const sub of subTasks) {
        sewingTotal += sub.quantity
        sewingDone  += sub.completedQty ?? 0

        const logs = await ctx.db
          .query('sewingLogs')
          .withIndex('by_sewingSubTask', q => q.eq('sewingSubTaskId', sub._id))
          .collect()

        const user     = sub.assignedTo ? await ctx.db.get(sub.assignedTo) : null
        const userName = user ? `${user.name ?? ''} ${user.lastName ?? ''}`.trim() || '—' : '—'

        for (const log of logs) {
          sewingLogs.push({ userName, size: sub.size ?? null, quantity: log.quantity, type: log.type, timestamp: log.timestamp })
        }
      }
    }
    sewingLogs.sort((a, b) => b.timestamp - a.timestamp)

    return {
      cutting: { total: cuttingTotal, done: cuttingDone, logs: cuttingLogs },
      sewing:  { total: sewingTotal,  done: sewingDone,  logs: sewingLogs },
    }
  },
})

export const getSewingTasksWithCuttingProgress = query({
  args: {},
  handler: async (ctx) => {
    const sewingTasks = await ctx.db.query('sewingTasks').collect()

    return Promise.all(sewingTasks.map(async (task) => {
      // Sub-tasks with resolved user names
      const subTasks = await ctx.db
        .query('sewingSubTasks')
        .withIndex('by_sewingTask', q => q.eq('sewingTaskId', task._id))
        .collect()

      const enrichedSubTasks = await Promise.all(subTasks.map(async (st) => {
        const user = st.assignedTo ? await ctx.db.get(st.assignedTo) : null
        const userName = user
          ? `${user.name ?? ''} ${user.lastName ?? ''}`.trim() || '—'
          : '—'
        return { ...st, userName }
      }))

      // Resolve the relevant cutting task(s): prefer the directly linked one
      let cuttingTasksForProgress = task.cuttingTaskId
        ? [await ctx.db.get(task.cuttingTaskId)].filter(Boolean) as Awaited<ReturnType<typeof ctx.db.get>>[]
        : (await ctx.db
            .query('cuttingTasks')
            .withIndex('by_productionOrder', q => q.eq('productionOrderId', task.productionOrderId))
            .collect()
          ).filter(ct => !task.color || ct.color === task.color)

      // Fabric color from the resolved cutting task
      let fabricColorHex: string | null = null
      let labelColorHex:  string | null = null
      const colorName = task.color ?? (cuttingTasksForProgress[0] as any)?.color ?? null
      if (colorName) {
        const fabricColor = await ctx.db
          .query('fabricColors')
          .filter(q => q.eq(q.field('name'), colorName))
          .first()
        fabricColorHex = fabricColor?.hex      ?? null
        labelColorHex  = fabricColor?.labelHex ?? null
      }

      // Aggregate cutting progress + collect logs (only for this task's cutting task)
      let totalQty     = 0
      let completedQty = 0
      const logs: Array<{
        specName:  string
        color:     string
        size:      string
        quantity:  number
        timestamp: number
      }> = []

      for (const ct of cuttingTasksForProgress as any[]) {
        const sizes = await ctx.db
          .query('cuttingTaskSizes')
          .withIndex('by_cuttingTask', q => q.eq('cuttingTaskId', ct._id))
          .collect()

        for (const sz of sizes) {
          totalQty     += sz.quantity
          completedQty += sz.completedQty
          for (const log of sz.logs ?? []) {
            logs.push({
              specName:  ct.specName,
              color:     ct.color,
              size:      sz.size,
              quantity:  log.quantity,
              timestamp: log.timestamp,
            })
          }
        }
      }

      logs.sort((a, b) => b.timestamp - a.timestamp)

      return {
        ...task,
        colorName,
        subTasks: enrichedSubTasks,
        fabricColorHex,
        labelColorHex,
        cuttingProgress: { totalQty, completedQty, logs },
      }
    }))
  },
})

export const getPlannerSubTasks = query({
  handler: async (ctx) => {
    const subTasks = await ctx.db.query('sewingSubTasks').collect()

    const results = await Promise.all(
      subTasks
        .filter((st) => st.assignedTo != null)
        .map(async (st) => {
          const sewingTask = await ctx.db.get(st.sewingTaskId)
          if (!sewingTask) return null

          let colorHex = '#6b7280'
          if (sewingTask.color) {
            const fc = await ctx.db
              .query('fabricColors')
              .filter((q) => q.eq(q.field('name'), sewingTask.color!))
              .first()
            colorHex = fc?.hex ?? colorHex
          }

          return {
            sewingSubTaskId: st._id,
            sewerId:         st.assignedTo!,
            startDateMs:     st.startDate  ?? null,
            quantity:        st.quantity,
            size:            st.size       ?? null,
            orderNumber:     sewingTask.orderIndex ?? sewingTask.keycrmOrderId,
            specName:        sewingTask.specName,
            color:           colorHex,
          }
        }),
    )

    return results.filter((r): r is NonNullable<typeof r> => r !== null)
  },
})

export const getSewerUsers = query({
  handler: async (ctx) => {
    const users = await ctx.db.query('users').collect()
    return users
      .filter((u) => u.role === 'seamstress' || u.role === 'tailor')
      .map((u) => ({
        _id:      u._id,
        name:     u.name     ?? '',
        lastName: u.lastName ?? '',
      }))
  },
})

// ─── MUTATIONS ───────────────────────────────────────────────────────────────

export const createSewingTask = mutation({
  args: {
    productionOrderId: v.id('productionOrders'),
    cuttingTaskId:     v.id('cuttingTasks'),
    keycrmOrderId:     v.string(),
    specName:          v.string(),
    totalQuantity:     v.number(),
    startDate:         v.number(),
    endDate:           v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('sewingTasks')
      .withIndex('by_cuttingTask', q => q.eq('cuttingTaskId', args.cuttingTaskId))
      .first()
    if (existing) return existing._id

    return ctx.db.insert('sewingTasks', {
      productionOrderId: args.productionOrderId,
      cuttingTaskId:     args.cuttingTaskId,
      keycrmOrderId:     args.keycrmOrderId,
      specName:          args.specName,
      totalQuantity:     args.totalQuantity,
      startDate:         args.startDate,
      endDate:           args.endDate,
      status:            'new',
    })
  },
})

export const createSewingSubTask = mutation({
  args: {
    sewingTaskId: v.id('sewingTasks'),
    assignedTo:   v.optional(v.id('users')),
    quantity:     v.number(),
    startDate:    v.number(),
    endDate:      v.number(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert('sewingSubTasks', {
      sewingTaskId: args.sewingTaskId,
      assignedTo:   args.assignedTo,
      quantity:     args.quantity,
      startDate:    args.startDate,
      endDate:      args.endDate,
      status:       'new',
    })
  },
})

export const splitSewingSubTask = mutation({
  args: {
    sewingSubTaskId: v.id('sewingSubTasks'),
    splitQty:        v.number(),
  },
  handler: async (ctx, args) => {
    const { sewingSubTaskId, splitQty } = args
    const original = await ctx.db.get(sewingSubTaskId)
    if (!original) throw new Error('sewingSubTask not found')
    if (splitQty <= 0 || splitQty >= original.quantity)
      throw new Error('splitQty must be between 1 and quantity-1')

    await ctx.db.patch(sewingSubTaskId, {
      quantity:   original.quantity - splitQty,
      assignedTo: undefined,
      startDate:  undefined,
      endDate:    undefined,
    })

    return ctx.db.insert('sewingSubTasks', {
      sewingTaskId:          original.sewingTaskId,
      productionOrderItemId: original.productionOrderItemId,
      size:                  original.size,
      quantity:              splitQty,
      completedQty:          0,
      status:                'new',
    })
  },
})

export const updateSewingSubTaskAssignee = mutation({
  args: {
    sewingSubTaskId: v.id('sewingSubTasks'),
    assignedTo:      v.optional(v.id('users')),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sewingSubTaskId, { assignedTo: args.assignedTo })
  },
})

export const updateSewingSubTaskDates = mutation({
  args: {
    sewingSubTaskId: v.id('sewingSubTasks'),
    startDate:       v.number(),
    endDate:         v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sewingSubTaskId, {
      startDate: args.startDate,
      endDate:   args.endDate,
    })
  },
})

export const updateSewingSubTaskStatus = mutation({
  args: {
    sewingSubTaskId: v.id('sewingSubTasks'),
    status: v.union(
      v.literal('new'),
      v.literal('in_progress'),
      v.literal('done'),
      v.literal('paused'),
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sewingSubTaskId, { status: args.status })
  },
})
