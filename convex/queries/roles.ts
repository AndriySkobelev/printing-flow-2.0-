import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'
import { mutation, query, type QueryCtx } from '../_generated/server'
import type { Doc } from '../_generated/dataModel'
import { ALL_PAGES, BASE_ROLES, ROLE_LABELS, SUPER_ADMIN, getDefaultRolePages } from '../lib/roles'

const baseRoleValidator = v.union(
  v.literal('admin'),
  v.literal('manager'),
  v.literal('seamstress'),
  v.literal('tailor'),
  v.literal('brander'),
)

type BaseRole = Doc<'roles'>['baseRole']

export const requireAdmin = async (ctx: QueryCtx) => {
  const userId = await getAuthUserId(ctx)
  if (!userId) throw new Error('Not authenticated')
  const user = await ctx.db.get(userId)
  if (user?.role !== 'admin' && user?.role !== SUPER_ADMIN) throw new Error('Forbidden')
  return user
}

const cleanPages = (pages: string[]) => ALL_PAGES.filter(p => pages.includes(p))

const cleanName = (name: string) => {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('Вкажіть назву ролі')
  return trimmed
}

const getSystemRoleDoc = (ctx: QueryCtx, role: BaseRole) =>
  ctx.db.query('roles').withIndex('by_systemKey', q => q.eq('systemKey', role)).first()

// The user's role name and pages as set in settings — added to every user the
// app reads, so access checks on the client stay synchronous.
export const withRole = async <T extends Doc<'users'>>(ctx: QueryCtx, user: T) => {
  if (user.roleId) {
    const custom = await ctx.db.get(user.roleId)
    if (custom) return { ...user, roleName: custom.name, rolePages: custom.pages }
  }
  if (!user.role || user.role === 'super_admin') {
    return { ...user, roleName: user.role ? ROLE_LABELS[user.role] : undefined, rolePages: undefined }
  }
  const system = await getSystemRoleDoc(ctx, user.role)
  return {
    ...user,
    roleName:  system?.name  ?? ROLE_LABELS[user.role],
    rolePages: system?.pages ?? getDefaultRolePages(user.role),
  }
}

// Built-in roles first (except super_admin, who always sees everything), then custom ones.
export const getRoles = query({
  handler: async (ctx) => {
    await requireAdmin(ctx)
    const docs  = await ctx.db.query('roles').collect()
    const users = await ctx.db.query('users').collect()

    const system = BASE_ROLES.map(role => {
      const doc = docs.find(d => d.systemKey === role)
      return {
        key:        role as string,
        name:       doc?.name  ?? ROLE_LABELS[role],
        pages:      doc?.pages ?? getDefaultRolePages(role),
        baseRole:   role as BaseRole,
        isSystem:   true,
        isChanged:  !!doc,
        usersCount: users.filter(u => u.role === role && !u.roleId).length,
      }
    })
    const custom = docs
      .filter(d => !d.systemKey)
      .sort((a, b) => a.name.localeCompare(b.name, 'uk'))
      .map(d => ({
        key:        d._id as string,
        name:       d.name,
        pages:      d.pages,
        baseRole:   d.baseRole,
        isSystem:   false,
        isChanged:  false,
        usersCount: users.filter(u => u.roleId === d._id).length,
      }))
    return [...system, ...custom]
  },
})

export const updateSystemRole = mutation({
  args: {
    role:  baseRoleValidator,
    name:  v.string(),
    pages: v.array(v.string()),
  },
  handler: async (ctx, { role, name, pages }) => {
    await requireAdmin(ctx)
    const data = { name: cleanName(name), pages: cleanPages(pages), baseRole: role, systemKey: role }
    const existing = await getSystemRoleDoc(ctx, role)
    if (existing) await ctx.db.patch(existing._id, data)
    else await ctx.db.insert('roles', data)
  },
})

// Back to the name and pages from code.
export const resetSystemRole = mutation({
  args: { role: baseRoleValidator },
  handler: async (ctx, { role }) => {
    await requireAdmin(ctx)
    const existing = await getSystemRoleDoc(ctx, role)
    if (existing) await ctx.db.delete(existing._id)
  },
})

export const createRole = mutation({
  args: {
    name:     v.string(),
    baseRole: baseRoleValidator,
    pages:    v.array(v.string()),
  },
  handler: async (ctx, { name, baseRole, pages }) => {
    await requireAdmin(ctx)
    return ctx.db.insert('roles', { name: cleanName(name), baseRole, pages: cleanPages(pages) })
  },
})

export const updateRole = mutation({
  args: {
    id:       v.id('roles'),
    name:     v.string(),
    baseRole: baseRoleValidator,
    pages:    v.array(v.string()),
  },
  handler: async (ctx, { id, name, baseRole, pages }) => {
    await requireAdmin(ctx)
    const role = await ctx.db.get(id)
    if (!role || role.systemKey) throw new Error('Роль не знайдено')
    await ctx.db.patch(id, { name: cleanName(name), baseRole, pages: cleanPages(pages) })
    if (role.baseRole !== baseRole) {
      const users = await ctx.db.query('users').withIndex('by_roleId', q => q.eq('roleId', id)).collect()
      for (const u of users) await ctx.db.patch(u._id, { role: baseRole })
    }
  },
})

// Its users fall back to the base role.
export const deleteRole = mutation({
  args: { id: v.id('roles') },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx)
    const role = await ctx.db.get(id)
    if (!role || role.systemKey) throw new Error('Роль не знайдено')
    const users = await ctx.db.query('users').withIndex('by_roleId', q => q.eq('roleId', id)).collect()
    for (const u of users) await ctx.db.patch(u._id, { roleId: undefined })
    await ctx.db.delete(id)
  },
})
