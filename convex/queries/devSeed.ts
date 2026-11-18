import { internalMutation } from '../_generated/server'

// Test seamstresses for clicking through the planner until real users with
// roles exist. Run: npx convex run queries/devSeed:seedMockSewers
const MOCK_SEWERS = [
  { name: 'Оля',   lastName: 'Коваль',  email: 'mock-sewer-1@test.local' },
  { name: 'Ірина', lastName: 'Бойко',   email: 'mock-sewer-2@test.local' },
  { name: 'Марта', lastName: 'Шевчук',  email: 'mock-sewer-3@test.local' },
]

export const seedMockSewers = internalMutation({
  handler: async (ctx) => {
    for (const sewer of MOCK_SEWERS) {
      const existing = await ctx.db
        .query('users')
        .withIndex('email', q => q.eq('email', sewer.email))
        .first()
      if (!existing) await ctx.db.insert('users', { ...sewer, role: 'seamstress' })
    }
  },
})

// Removes the test seamstresses and frees their sub-tasks (the day stays).
// Run: npx convex run queries/devSeed:removeMockSewers
export const removeMockSewers = internalMutation({
  handler: async (ctx) => {
    for (const sewer of MOCK_SEWERS) {
      const user = await ctx.db
        .query('users')
        .withIndex('email', q => q.eq('email', sewer.email))
        .first()
      if (!user) continue
      const subTasks = await ctx.db
        .query('sewingSubTasks')
        .withIndex('by_assignedTo', q => q.eq('assignedTo', user._id))
        .collect()
      for (const st of subTasks) await ctx.db.patch(st._id, { assignedTo: undefined })
      await ctx.db.delete(user._id)
    }
  },
})
