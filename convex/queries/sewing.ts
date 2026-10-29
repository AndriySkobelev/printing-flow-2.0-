import { v } from 'convex/values'
import { query, mutation } from '../_generated/server'
import type { Id } from '../_generated/dataModel'

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

    // Branding types used anywhere in an order (cutting or after sewing) —
    // shared by all of the order's sewing tasks, so read its items once.
    const orderBrandingTypes = new Map<string, Promise<string[]>>()
    const getOrderBrandingTypes = (productionOrderId: Id<'productionOrders'>) => {
      if (!orderBrandingTypes.has(productionOrderId)) {
        orderBrandingTypes.set(productionOrderId, ctx.db
          .query('productionOrderItems')
          .withIndex('by_productionOrder', q => q.eq('productionOrderId', productionOrderId))
          .collect()
          .then(items => [...new Set(items.flatMap(i => [...(i.brandingType ?? []), ...(i.cuttingBrandingType ?? [])]))]))
      }
      return orderBrandingTypes.get(productionOrderId)!
    }

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
        // Fall back to the linked productionOrderItem's custom flag — older
        // sub-tasks (and the overrun-cutting insert path) don't copy it themselves.
        const item = st.productionOrderItemId ? await ctx.db.get(st.productionOrderItemId) : null
        return {
          ...st,
          userName,
          isCustomSewing:      st.isCustomSewing      ?? item?.isCustomSewing      ?? false,
          customSewingComment: st.customSewingComment ?? item?.customSewingComment ?? undefined,
          isCustomCut:         item?.isCustomCut ?? false,
        }
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
          .withIndex('by_name', q => q.eq('name', colorName))
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
        brandingTypes: await getOrderBrandingTypes(task.productionOrderId),
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
              .withIndex('by_name', (q) => q.eq('name', sewingTask.color!))
              .first()
            colorHex = fc?.hex ?? colorHex
          }

          return {
            sewingSubTaskId: st._id,
            sewerId:         st.assignedTo!,
            startDateMs:     st.startDate  ?? null,
            quantity:        st.quantity,
            size:            st.size       ?? null,
            extraWorks:      st.extraWorks ?? [],
            orderNumber:     sewingTask.orderIndex ?? sewingTask.keycrmOrderId,
            specName:        sewingTask.specName,
            color:           colorHex,
            status:          st.status,
          }
        }),
    )

    return results.filter((r): r is NonNullable<typeof r> => r !== null)
  },
})

export const getMySubTasks = query({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    const subTasks = await ctx.db
      .query('sewingSubTasks')
      .withIndex('by_assignedTo', q => q.eq('assignedTo', userId))
      .collect()

    return Promise.all(subTasks.map(async (st) => {
      const task           = await ctx.db.get(st.sewingTaskId)
      const productionOrder = task ? await ctx.db.get(task.productionOrderId) : null

      const item    = st.productionOrderItemId ? await ctx.db.get(st.productionOrderItemId) : null
      const product = item?.productId ? await ctx.db.get(item.productId) : null
      const spec    = product ? await ctx.db.get(product.parentId) : null

      return {
        ...st,
        keycrmOrderId: task?.keycrmOrderId ?? null,
        orderIndex:    task?.orderIndex    ?? null,
        specName:      task?.specName      ?? null,
        color:         task?.color         ?? null,
        taskEndDate:   task?.endDate       ?? null,
        images:        [...(productionOrder?.attachedFiles ?? []), ...(spec?.attachedFiles ?? [])],
        // Fall back to the linked productionOrderItem's custom flag — older
        // sub-tasks don't copy it themselves (see getSewingTasksWithCuttingProgress).
        isCustomSewing:      st.isCustomSewing      ?? item?.isCustomSewing      ?? false,
        customSewingComment: st.customSewingComment ?? item?.customSewingComment ?? undefined,
      }
    }))
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

export const updateSewingTaskStatus = mutation({
  args: {
    sewingTaskId: v.id('sewingTasks'),
    status: v.union(v.literal('new'), v.literal('distributed')),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sewingTaskId, { status: args.status })
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
      extraWorks:            original.extraWorks,
      splitFromId:           sewingSubTaskId,
    })
  },
})

// Undoes a split: folds the part's quantity back into the sub-task it was split
// from and deletes the part. Parts split before splitFromId existed fall back to
// the oldest sub-task of the same order item in the same sewing task.
export const mergeSewingSubTaskIntoParent = mutation({
  args: { sewingSubTaskId: v.id('sewingSubTasks') },
  handler: async (ctx, { sewingSubTaskId }) => {
    const part = await ctx.db.get(sewingSubTaskId)
    if (!part) throw new Error('sewingSubTask not found')
    if (part.status !== 'new' || (part.completedQty ?? 0) > 0)
      throw new Error('Частину вже почали шити — повернути не можна')
    const log = await ctx.db.query('sewingLogs').withIndex('by_sewingSubTask', q => q.eq('sewingSubTaskId', sewingSubTaskId)).first()
    if (log) throw new Error('По частині вже є записи пошиву — повернути не можна')

    let parent = part.splitFromId ? await ctx.db.get(part.splitFromId) : null
    if (!parent && part.productionOrderItemId) {
      const siblings = await ctx.db
        .query('sewingSubTasks')
        .withIndex('by_sewingTask', q => q.eq('sewingTaskId', part.sewingTaskId))
        .collect()
      parent = siblings
        .filter(s => s._id !== part._id && s.productionOrderItemId === part.productionOrderItemId && s._creationTime < part._creationTime)
        .sort((a, b) => a._creationTime - b._creationTime)[0] ?? null
    }
    if (!parent) throw new Error('Не знайдено підзадачу, від якої відділено цю частину')
    if (parent.status === 'done') throw new Error('Основна підзадача вже готова — повернути не можна')

    await ctx.db.patch(parent._id, { quantity: parent.quantity + part.quantity })

    // Parts split off this one now belong to the parent.
    const children = await ctx.db
      .query('sewingSubTasks')
      .withIndex('by_sewingTask', q => q.eq('sewingTaskId', part.sewingTaskId))
      .collect()
    await Promise.all(children
      .filter(c => c.splitFromId === part._id)
      .map(c => ctx.db.patch(c._id, { splitFromId: parent._id })))

    await ctx.db.delete(part._id)
  },
})

// Adds the catalog work to the sub-task, or removes it if it's already there.
export const toggleSewingSubTaskExtraWork = mutation({
  args: {
    sewingSubTaskId: v.id('sewingSubTasks'),
    extraWorkId:     v.id('extraWorks'),
  },
  handler: async (ctx, { sewingSubTaskId, extraWorkId }) => {
    const subTask = await ctx.db.get(sewingSubTaskId)
    if (!subTask) throw new Error('sewingSubTask not found')

    const current = subTask.extraWorks ?? []
    if (current.some(w => w.workId === extraWorkId)) {
      const next = current.filter(w => w.workId !== extraWorkId)
      await ctx.db.patch(sewingSubTaskId, { extraWorks: next.length ? next : undefined })
      return
    }

    const work = await ctx.db.get(extraWorkId)
    if (!work) throw new Error('Роботу не знайдено')
    await ctx.db.patch(sewingSubTaskId, {
      extraWorks: [...current, { workId: work._id, name: work.name, minutesPerUnit: work.minutesPerUnit, price: work.price }],
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

export const completeSewingSubTask = mutation({
  args: { sewingSubTaskId: v.id('sewingSubTasks') },
  handler: async (ctx, { sewingSubTaskId }) => {
    const sub = await ctx.db.get(sewingSubTaskId)
    if (!sub) throw new Error('sewingSubTask not found')
    await ctx.db.patch(sewingSubTaskId, { status: 'done', completedQty: sub.quantity })
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
