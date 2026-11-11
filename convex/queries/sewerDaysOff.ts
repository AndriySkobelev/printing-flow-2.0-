import { v } from 'convex/values'
import { query, mutation, type QueryCtx } from '../_generated/server'
import { type Id } from '../_generated/dataModel'
import { getAuthUserId } from '@convex-dev/auth/server'

const DAY_MS = 24 * 60 * 60 * 1000
const utcDayStart = (ms: number) => Math.floor(ms / DAY_MS) * DAY_MS
const PLANNER_ROLES = ['super_admin', 'admin', 'manager']

const requirePlanner = async (ctx: QueryCtx) => {
  const userId = await getAuthUserId(ctx)
  const me     = userId ? await ctx.db.get(userId) : null
  if (!me || !PLANNER_ROLES.includes(me.role ?? '')) throw new Error('Forbidden')
  return me._id
}

const overlapping = async (ctx: QueryCtx, from: number, to: number, userId?: Id<'users'>) => {
  const start = utcDayStart(from)
  const rows  = userId
    ? await ctx.db.query('sewerDaysOff').withIndex('by_userId_to', q => q.eq('userId', userId).gte('to', start)).collect()
    : await ctx.db.query('sewerDaysOff').withIndex('by_to', q => q.gte('to', start)).collect()
  return rows.filter(r => r.from <= to).sort((a, b) => a.from - b.from)
}

// Every day off (UTC midnight) of the sewer from `fromMs` on, a year ahead at most.
export const getSewerDaysOffSet = async (ctx: QueryCtx, userId: Id<'users'>, fromMs: number) => {
  const start = utcDayStart(fromMs)
  const end   = start + 366 * DAY_MS
  const days  = new Set<number>()
  for (const r of await overlapping(ctx, start, end, userId)) {
    for (let d = Math.max(r.from, start); d <= Math.min(r.to, end); d += DAY_MS) days.add(d)
  }
  return days
}

// Periods overlapping `from`–`to`, of every sewer or of one.
export const getSewerDaysOff = query({
  args: {
    from:   v.number(),
    to:     v.number(),
    userId: v.optional(v.id('users')),
  },
  handler: async (ctx, { from, to, userId }) => overlapping(ctx, from, to, userId),
})

export const createSewerDayOff = mutation({
  args: {
    userId: v.id('users'),
    from:   v.number(),
    to:     v.number(),
    note:   v.optional(v.string()),
  },
  handler: async (ctx, { userId, from, to, note }) => {
    const createdBy = await requirePlanner(ctx)
    const start = utcDayStart(Math.min(from, to))
    const end   = utcDayStart(Math.max(from, to))
    return ctx.db.insert('sewerDaysOff', { userId, from: start, to: end, createdBy, ...(note?.trim() && { note: note.trim() }) })
  },
})

export const deleteSewerDayOff = mutation({
  args: { id: v.id('sewerDaysOff') },
  handler: async (ctx, { id }) => {
    await requirePlanner(ctx)
    await ctx.db.delete(id)
  },
})
