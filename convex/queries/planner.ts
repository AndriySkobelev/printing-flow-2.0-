import { v } from 'convex/values'
import { query, mutation } from '../_generated/server'

export const getEventsByDateRange = query({
  args: { from: v.string(), to: v.string() },
  handler: async (ctx, { from, to }) => {
    const all = await ctx.db.query('plannerEvents').collect()
    return all.filter(e => e.date >= from && e.date <= to)
  },
})

export const createEvent = mutation({
  args: {
    orderId: v.string(),
    orderNumber: v.string(),
    sewerId: v.string(),
    date: v.string(),
    startH: v.number(),
    startM: v.number(),
    duration: v.number(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert('plannerEvents', args)
  },
})

export const updateEvent = mutation({
  args: {
    id: v.id('plannerEvents'),
    sewerId: v.optional(v.string()),
    date: v.optional(v.string()),
    startH: v.optional(v.number()),
    startM: v.optional(v.number()),
    duration: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...patch }) => {
    await ctx.db.patch(id, patch)
  },
})

export const deleteEvent = mutation({
  args: { id: v.id('plannerEvents') },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id)
  },
})