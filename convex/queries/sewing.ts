import { v } from 'convex/values'
import { query, mutation } from '../_generated/server'
import type { Id } from '../_generated/dataModel'
import type { MutationCtx } from '../_generated/server'
import { taskDurationMinutes, SEWER_DAY_CAPACITY } from '../lib/sewingDuration'

const DAY_MS = 24 * 60 * 60 * 1000

// Planner days are stored as UTC midnight of the day in sub-task startDate.
const utcDayStart = (ms: number) => Math.floor(ms / DAY_MS) * DAY_MS

// Minutes already planned for the sewer per day (UTC midnight), leaving out
// the given sub-tasks — the ones being (re)placed.
const sewerLoadByDay = async (ctx: MutationCtx, sewerId: Id<'users'>, exclude: Set<string>) => {
  const loadByDay = new Map<number, number>()
  const sewerSubTasks = await ctx.db
    .query('sewingSubTasks')
    .withIndex('by_assignedTo', q => q.eq('assignedTo', sewerId))
    .collect()
  for (const st of sewerSubTasks) {
    if (exclude.has(st._id) || st.startDate == null) continue
    const day = utcDayStart(st.startDate)
    loadByDay.set(day, (loadByDay.get(day) ?? 0) + taskDurationMinutes(st.quantity, st.extraWorks))
  }
  return loadByDay
}

const isWorkday = (day: number) => {
  const weekday = new Date(day).getUTCDay()
  return weekday !== 0 && weekday !== 6
}

// Indexes of the items whose sum is the largest that still fits `capacity`
// (subset sum over minutes). Ties keep the earlier-found combination.
const bestFillIndexes = (durations: number[], capacity: number) => {
  if (capacity <= 0 || durations.length === 0) return []
  // from[c] = [item index, previous sum] that first reached sum c
  const from: ([number, number] | null)[] = Array(capacity + 1).fill(null)
  const reached = new Set<number>([0])
  durations.forEach((d, i) => {
    for (const c of [...reached].sort((x, y) => y - x)) {
      const next = c + d
      if (next <= capacity && !reached.has(next)) {
        reached.add(next)
        from[next] = [i, c]
      }
    }
  })
  const picked: number[] = []
  for (let c = Math.max(...reached); c > 0; c = from[c]![1]) picked.push(from[c]![0])
  return picked
}

// Fills days one after another, earliest first: each day (from `fromMs`, today
// at the earliest) gets the combination of the remaining tasks that fills it
// closest to full. Tasks longer than a whole day can't fit anywhere — each then
// takes the next empty day of its own, overloaded.
const planDays = <T extends { duration: number }>(loadByDay: Map<number, number>, tasks: T[], fromMs: number) => {
  const placed = new Map<T, number>()
  const start  = Math.max(utcDayStart(fromMs), utcDayStart(Date.now()))
  let rest     = tasks.filter(t => t.duration <= SEWER_DAY_CAPACITY)
  let oversize = tasks.filter(t => t.duration >  SEWER_DAY_CAPACITY)

  for (let i = 0; i < 365 && (rest.length > 0 || oversize.length > 0); i++) {
    const day = start + i * DAY_MS
    if (!isWorkday(day)) continue
    const used = loadByDay.get(day) ?? 0

    if (rest.length > 0) {
      // An already overloaded day has no room (free < 0) and is just skipped.
      const free   = Math.max(0, SEWER_DAY_CAPACITY - used)
      const fits   = rest.filter(t => t.duration <= free)
      const picked = bestFillIndexes(fits.map(t => t.duration), free).map(k => fits[k])
      for (const t of picked) {
        placed.set(t, day)
        loadByDay.set(day, (loadByDay.get(day) ?? 0) + t.duration)
      }
      rest = rest.filter(t => !picked.includes(t))
    } else if (used === 0) {
      const t = oversize[0]
      placed.set(t, day)
      loadByDay.set(day, t.duration)
      oversize = oversize.slice(1)
    }
  }

  // Nothing found within a year — leave the rest on the start day.
  for (const t of [...rest, ...oversize]) placed.set(t, start)
  return placed
}

// A sewing task is "distributed" once every sub-task has at least a day, and
// goes back to "new" when one loses it. Other statuses are left alone.
const syncSewingTaskDistributed = async (ctx: MutationCtx, sewingTaskIds: Iterable<Id<'sewingTasks'>>) => {
  for (const id of new Set(sewingTaskIds)) {
    const task = await ctx.db.get(id)
    if (!task || (task.status !== 'new' && task.status !== 'distributed')) continue
    const subs       = await ctx.db.query('sewingSubTasks').withIndex('by_sewingTask', q => q.eq('sewingTaskId', id)).collect()
    const allPlanned = subs.length > 0 && subs.every(st => st.startDate != null)
    const next       = allPlanned ? 'distributed' : 'new'
    if (task.status !== next) await ctx.db.patch(id, { status: next })
  }
}

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
  // day (UTC midnight): only tasks with a sub-task planned on that day.
  args: { day: v.optional(v.number()) },
  handler: async (ctx, { day }) => {
    let sewingTasks = await ctx.db.query('sewingTasks').collect()

    if (day != null) {
      const dayStart  = utcDayStart(day)
      const plannedOn = await ctx.db
        .query('sewingSubTasks')
        .withIndex('by_startDate', q => q.gte('startDate', dayStart).lt('startDate', dayStart + DAY_MS))
        .collect()
      const taskIds = new Set<string>(plannedOn.map(st => st.sewingTaskId))
      sewingTasks = sewingTasks.filter(t => taskIds.has(t._id))
    }

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
        // On the board: given to a sewer and/or put on a day, or split off a planned one.
        .filter((st) => st.assignedTo != null || st.startDate != null || st.splitWhilePlanned)
        .map(async (st) => {
          const sewingTask = await ctx.db.get(st.sewingTaskId)
          if (!sewingTask) return null

          let colorHex = '#6b7280'
          let labelHex: string | null = null
          if (sewingTask.color) {
            const fc = await ctx.db
              .query('fabricColors')
              .withIndex('by_name', (q) => q.eq('name', sewingTask.color!))
              .first()
            colorHex = fc?.hex      ?? colorHex
            labelHex = fc?.labelHex ?? null
          }

          const item = st.productionOrderItemId ? await ctx.db.get(st.productionOrderItemId) : null

          return {
            sewingSubTaskId: st._id,
            sewerId:         st.assignedTo ?? null,
            startDateMs:     st.startDate  ?? null,
            quantity:        st.quantity,
            size:            st.size       ?? null,
            extraWorks:      st.extraWorks ?? [],
            orderNumber:     sewingTask.orderIndex ?? sewingTask.keycrmOrderId,
            specName:        sewingTask.specName,
            color:           colorHex,
            colorName:       sewingTask.color ?? null,
            labelColorHex:   labelHex,
            status:          st.status,
            isCustom:        (st.isCustomSewing ?? item?.isCustomSewing ?? false) || (item?.isCustomCut ?? false),
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

    // A planned sub-task keeps its sewer and day; the part split off it goes to
    // the planner's "not distributed" strip — as does a part split off a task
    // already waiting there. Unplanned ones split as before.
    const wasPlanned = original.assignedTo != null || original.startDate != null || original.splitWhilePlanned === true

    await ctx.db.patch(sewingSubTaskId, wasPlanned
      ? { quantity: original.quantity - splitQty }
      : {
          quantity:   original.quantity - splitQty,
          assignedTo: undefined,
          startDate:  undefined,
          endDate:    undefined,
        })

    const partId = await ctx.db.insert('sewingSubTasks', {
      sewingTaskId:          original.sewingTaskId,
      productionOrderItemId: original.productionOrderItemId,
      size:                  original.size,
      quantity:              splitQty,
      completedQty:          0,
      status:                'new',
      extraWorks:            original.extraWorks,
      splitFromId:           sewingSubTaskId,
      ...(wasPlanned && { splitWhilePlanned: true }),
    })
    await syncSewingTaskDistributed(ctx, [original.sewingTaskId])
    return partId
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
    await syncSewingTaskDistributed(ctx, [part.sewingTaskId])
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

// Adds the work to every given sub-task that lacks it, or (add=false) removes it from all.
export const bulkSetSewingSubTaskExtraWork = mutation({
  args: {
    sewingSubTaskIds: v.array(v.id('sewingSubTasks')),
    extraWorkId:      v.id('extraWorks'),
    add:              v.boolean(),
  },
  handler: async (ctx, { sewingSubTaskIds, extraWorkId, add }) => {
    const work = add ? await ctx.db.get(extraWorkId) : null
    if (add && !work) throw new Error('Роботу не знайдено')

    for (const id of sewingSubTaskIds) {
      const subTask = await ctx.db.get(id)
      if (!subTask) continue
      const current = subTask.extraWorks ?? []
      const has     = current.some(w => w.workId === extraWorkId)

      if (add && !has && work) {
        await ctx.db.patch(id, {
          extraWorks: [...current, { workId: work._id, name: work.name, minutesPerUnit: work.minutesPerUnit, price: work.price }],
        })
      } else if (!add && has) {
        const next = current.filter(w => w.workId !== extraWorkId)
        await ctx.db.patch(id, { extraWorks: next.length ? next : undefined })
      }
    }
  },
})

// Giving sub-tasks to a sewer also plans them onto her days (see planDays),
// starting from the earliest day already picked for any of them. The given
// sub-tasks don't count as load, so re-running gives the same layout.
// Unassigning keeps the day.
const assignSubTasks = async (ctx: MutationCtx, ids: Id<'sewingSubTasks'>[], assignedTo?: Id<'users'>) => {
  const subs = (await Promise.all(ids.map(id => ctx.db.get(id)))).filter((s): s is NonNullable<typeof s> => s !== null)

  if (!assignedTo) {
    for (const sub of subs) await ctx.db.patch(sub._id, { assignedTo: undefined })
    return
  }

  const loadByDay = await sewerLoadByDay(ctx, assignedTo, new Set(subs.map(s => s._id)))
  const fromMs    = Math.min(...subs.map(s => s.startDate ?? Date.now()))
  const tasks     = subs.map(sub => ({ sub, duration: taskDurationMinutes(sub.quantity, sub.extraWorks) }))

  for (const [{ sub }, day] of planDays(loadByDay, tasks, fromMs)) {
    await ctx.db.patch(sub._id, { assignedTo, startDate: day, endDate: day })
  }
  await syncSewingTaskDistributed(ctx, subs.map(s => s.sewingTaskId))
}

export const updateSewingSubTaskAssignee = mutation({
  args: {
    sewingSubTaskId: v.id('sewingSubTasks'),
    assignedTo:      v.optional(v.id('users')),
  },
  handler: async (ctx, args) => {
    if (!(await ctx.db.get(args.sewingSubTaskId))) throw new Error('sewingSubTask not found')
    await assignSubTasks(ctx, [args.sewingSubTaskId], args.assignedTo)
  },
})

export const bulkAssignSewingSubTasks = mutation({
  args: {
    sewingSubTaskIds: v.array(v.id('sewingSubTasks')),
    assignedTo:       v.optional(v.id('users')),
  },
  handler: async (ctx, args) => assignSubTasks(ctx, args.sewingSubTaskIds, args.assignedTo),
})

// Explicit placement from the board: a day (UTC midnight, or null to take it
// off the board) and, when given, the sewer (null = no sewer yet).
export const setSewingSubTaskDay = mutation({
  args: {
    sewingSubTaskId: v.id('sewingSubTasks'),
    day:             v.union(v.number(), v.null()),
    assignedTo:      v.optional(v.union(v.id('users'), v.null())),
  },
  handler: async (ctx, args) => {
    const sub = await ctx.db.get(args.sewingSubTaskId)
    if (!sub) throw new Error('sewingSubTask not found')
    const day = args.day == null ? undefined : utcDayStart(args.day)
    await ctx.db.patch(args.sewingSubTaskId, {
      startDate: day,
      endDate:   day,
      ...(args.assignedTo !== undefined && { assignedTo: args.assignedTo ?? undefined }),
    })
    await syncSewingTaskDistributed(ctx, [sub.sewingTaskId])
  },
})

export const bulkSetSewingSubTaskDay = mutation({
  args: {
    sewingSubTaskIds: v.array(v.id('sewingSubTasks')),
    day:              v.union(v.number(), v.null()),
  },
  handler: async (ctx, args) => {
    const day = args.day == null ? undefined : utcDayStart(args.day)
    const taskIds: Id<'sewingTasks'>[] = []
    for (const id of args.sewingSubTaskIds) {
      const sub = await ctx.db.get(id)
      if (!sub) continue
      await ctx.db.patch(id, { startDate: day, endDate: day })
      taskIds.push(sub.sewingTaskId)
    }
    await syncSewingTaskDistributed(ctx, taskIds)
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
