import { getAuthUserId } from "@convex-dev/auth/server";
import { internalMutation, mutation, query, type MutationCtx } from "../_generated/server";
import { type Id } from "../_generated/dataModel";
import { v } from "convex/values";
import { requirePage, requirePermission, withRole } from "./roles";

const roleValidator = v.optional(v.union(
  v.literal('super_admin'),
  v.literal('admin'),
  v.literal('manager'),
  v.literal('seamstress'),
  v.literal('tailor'),
  v.literal('brander'),
))

// Only a super admin may touch another super admin or hand the role out.
const guardSuperAdmin = async (ctx: MutationCtx, me: { role?: string }, targetId: Id<'users'>, nextRole?: string) => {
  if (me.role === 'super_admin') return;
  const target = await ctx.db.get(targetId);
  if (target?.role === 'super_admin' || nextRole === 'super_admin') throw new Error('Недостатньо прав для цієї дії');
};

// A leftover authAccounts row makes every later sign-in with that Google account fail.
const removeAuthData = async (ctx: MutationCtx, userId: Id<'users'>) => {
  const accounts = await ctx.db
    .query('authAccounts')
    .withIndex('userIdAndProvider', q => q.eq('userId', userId))
    .collect();
  for (const account of accounts) {
    const codes = await ctx.db
      .query('authVerificationCodes')
      .withIndex('accountId', q => q.eq('accountId', account._id))
      .collect();
    await Promise.all(codes.map(c => ctx.db.delete(c._id)));
    await ctx.db.delete(account._id);
  }

  const sessions = await ctx.db
    .query('authSessions')
    .withIndex('userId', q => q.eq('userId', userId))
    .collect();
  for (const session of sessions) {
    const tokens = await ctx.db
      .query('authRefreshTokens')
      .withIndex('sessionId', q => q.eq('sessionId', session._id))
      .collect();
    await Promise.all(tokens.map(t => ctx.db.delete(t._id)));
    await ctx.db.delete(session._id);
  }
};

export const approveUser = mutation({
  args: { id: v.id('users') },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    const me = userId ? await ctx.db.get(userId) : null;
    if (me?.role !== 'super_admin') throw new Error('Forbidden');
    await ctx.db.patch(id, { isApproved: true });
  },
});

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
    await requirePage(ctx, '/app/users');
    const users = await ctx.db.query('users').collect();
    return Promise.all(users.map(u => withRole(ctx, u)));
  },
});

export const getUserById = query({
  args: { id: v.id('users') },
  handler: async (ctx, { id }) => {
    await requirePage(ctx, '/app/users');
    const user = await ctx.db.get(id);
    return user ? withRole(ctx, user) : null;
  },
});

// `allowedPages: undefined` resets the user back to their role defaults.
export const updateUserPages = mutation({
  args: {
    id: v.id('users'),
    allowedPages: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { id, allowedPages }) => {
    const me = await requirePermission(ctx, '/app/users', 'edit');
    await guardSuperAdmin(ctx, me, id);
    await ctx.db.patch(id, { allowedPages });
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
      roleId:    v.optional(v.id('roles')),
    }),
  },
  // Picking a role replaces the custom one; a custom role sets its base role.
  handler: async (ctx, { id, data }) => {
    const me = await requirePermission(ctx, '/app/users', 'edit');
    await guardSuperAdmin(ctx, me, id, data.role);
    if (data.roleId) {
      const custom = await ctx.db.get(data.roleId);
      if (!custom || custom.systemKey) throw new Error('Роль не знайдено');
      await ctx.db.patch(id, { ...data, role: custom.baseRole });
    } else if (data.role) {
      await ctx.db.patch(id, { ...data, roleId: undefined });
    } else {
      await ctx.db.patch(id, data);
    }
  },
});

export const deleteUser = mutation({
  args: { id: v.id('users') },
  handler: async (ctx, { id }) => {
    const me = await requirePermission(ctx, '/app/users', 'delete');
    if (me._id === id) throw new Error('Не можна видалити самого себе');
    await guardSuperAdmin(ctx, me, id);
    await removeAuthData(ctx, id);
    await ctx.db.delete(id);
  },
});

// For users deleted before deleteUser cleaned up after itself.
export const purgeDeletedUserAuth = internalMutation({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    if (await ctx.db.get(userId)) throw new Error('User still exists');
    await removeAuthData(ctx, userId);
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
    await requirePermission(ctx, '/app/users', 'edit');
    await ctx.db.patch(id, { developingSpecification });
  },
});