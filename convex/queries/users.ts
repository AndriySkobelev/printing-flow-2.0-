import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "../_generated/server";
import { v } from "convex/values";

const roleValidator = v.optional(v.union(
  v.literal('super_admin'),
  v.literal('admin'),
  v.literal('manager'),
  v.literal('seamstress'),
  v.literal('tailor'),
  v.literal('brander'),
))

async function requireAdmin(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error('Not authenticated');
  const user = await ctx.db.get(userId);
  if (user?.role !== 'admin' && user?.role !== 'super_admin') throw new Error('Forbidden');
}

export const updateCurrentUser = mutation({
  args: {
    name:      v.optional(v.string()),
    lastName:  v.optional(v.string()),
    phone:     v.optional(v.string()),
    birthday:  v.optional(v.string()),
    workHours: v.optional(v.number()),
    startDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Not authenticated');
    await ctx.db.patch(userId, args);
  },
});

export const getAllUsers = query({
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return ctx.db.query('users').collect();
  },
});

export const updateUser = mutation({
  args: {
    id: v.id('users'),
    data: v.object({
      name:      v.optional(v.string()),
      lastName:  v.optional(v.string()),
      phone:     v.optional(v.string()),
      birthday:  v.optional(v.string()),
      workHours: v.optional(v.number()),
      startDate: v.optional(v.string()),
      role:      roleValidator,
    }),
  },
  handler: async (ctx, { id, data }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(id, data);
  },
});

export const deleteUser = mutation({
  args: { id: v.id('users') },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    await ctx.db.delete(id);
  },
});

export const updateSeamstressData = mutation({
  args: {
    id: v.id('users'),
    developingSpecification: v.array(v.object({
      specificationId: v.id('specifications'),
      developingTime:  v.number(),
    })),
  },
  handler: async (ctx, { id, developingSpecification }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(id, { developingSpecification });
  },
});