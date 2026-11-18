import { v } from 'convex/values'
import { mutation, query } from '../_generated/server'

export const getExtraWorks = query({
  args: {},
  handler: async (ctx) => {
    const works = await ctx.db.query('extraWorks').collect()
    return works.sort((a, b) => a.name.localeCompare(b.name, 'uk'))
  },
})

const extraWorkArgs = {
  name:           v.string(),
  minutesPerUnit: v.number(),
  price:          v.optional(v.number()),
}

const validate = ({ name, minutesPerUnit, price }: { name: string; minutesPerUnit: number; price?: number }) => {
  if (!name.trim()) throw new Error('Вкажіть назву')
  if (!(minutesPerUnit > 0)) throw new Error('Норма часу має бути більше 0')
  if (price !== undefined && !(price >= 0)) throw new Error('Ціна не може бути відʼємною')
}

export const createExtraWork = mutation({
  args: extraWorkArgs,
  handler: async (ctx, args) => {
    validate(args)
    return ctx.db.insert('extraWorks', { name: args.name.trim(), minutesPerUnit: args.minutesPerUnit, price: args.price })
  },
})

export const updateExtraWork = mutation({
  args: { extraWorkId: v.id('extraWorks'), ...extraWorkArgs },
  handler: async (ctx, { extraWorkId, ...args }) => {
    validate(args)
    // price: undefined clears a previously set price
    await ctx.db.patch(extraWorkId, { name: args.name.trim(), minutesPerUnit: args.minutesPerUnit, price: args.price })
  },
})

// Sub-tasks keep their own copy of the work, so deleting from the catalog
// doesn't touch work that's already been added.
export const deleteExtraWork = mutation({
  args: { extraWorkId: v.id('extraWorks') },
  handler: async (ctx, { extraWorkId }) => {
    await ctx.db.delete(extraWorkId)
  },
})
