import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'
import { mutation, query, type QueryCtx } from '../_generated/server'
import type { Doc } from '../_generated/dataModel'
import {
  ALL_PAGES, BASE_ROLES, ROLE_LABELS, allPermissions, can, getDefaultRolePages, getUserPages,
  type PageAction,
} from '../lib/roles'

const baseRoleValidator = v.union(
  v.literal('admin'),
  v.literal('manager'),
  v.literal('seamstress'),
  v.literal('tailor'),
  v.literal('brander'),
)

type BaseRole = Doc<'roles'>['baseRole']

const getMe = async (ctx: QueryCtx) => {
  const userId = await getAuthUserId(ctx)
  if (!userId) throw new Error('Not authenticated')
  const user = await ctx.db.get(userId)
  if (!user) throw new Error('Not authenticated')
  return withRole(ctx, user)
}

// For queries: the signed-in user must see the page.
export const requirePage = async (ctx: QueryCtx, page: string) => {
  const me = await getMe(ctx)
  if (!getUserPages(me).includes(page)) throw new Error('Forbidden')
  return me
}

// For mutations: the signed-in user's role must allow the action on the page.
export const requirePermission = async (ctx: QueryCtx, page: string, action: PageAction) => {
  const me = await getMe(ctx)
  if (!can(me, page, action)) throw new Error('Недостатньо прав для цієї дії')
  return me
}

const cleanPages = (pages: string[]) => ALL_PAGES.filter(p => pages.includes(p))

// Only actions that exist, on pages the role sees.
const cleanPermissions = (permissions: string[], pages: string[]) =>
  allPermissions(pages).filter(k => permissions.includes(k))

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
    if (custom) return { ...user, roleName: custom.name, rolePages: custom.pages, permissions: custom.permissions }
  }
  if (!user.role || user.role === 'super_admin') {
    return { ...user, roleName: user.role ? ROLE_LABELS[user.role] : undefined, rolePages: undefined, permissions: undefined }
  }
  const system = await getSystemRoleDoc(ctx, user.role)
  return {
    ...user,
    roleName:    system?.name  ?? ROLE_LABELS[user.role],
    rolePages:   system?.pages ?? getDefaultRolePages(user.role),
    permissions: system?.permissions,
  }
}

// Built-in roles first (except super_admin, who always sees everything), then custom ones.
export const getRoles = query({
  handler: async (ctx) => {
    await requirePage(ctx, '/app/settings')
    const docs  = await ctx.db.query('roles').collect()
    const users = await ctx.db.query('users').collect()

    const system = BASE_ROLES.map(role => {
      const doc   = docs.find(d => d.systemKey === role)
      const pages = doc?.pages ?? getDefaultRolePages(role)
      return {
        key:         role as string,
        name:        doc?.name  ?? ROLE_LABELS[role],
        pages,
        permissions: doc?.permissions ?? allPermissions(pages),
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
        pages:       d.pages,
        permissions: d.permissions ?? allPermissions(d.pages),
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
    name:        v.string(),
    pages:       v.array(v.string()),
    permissions: v.array(v.string()),
  },
  handler: async (ctx, { role, name, pages, permissions }) => {
    await requirePermission(ctx, '/app/settings', 'edit')
    const data = { name: cleanName(name), pages: cleanPages(pages), permissions: cleanPermissions(permissions, pages), baseRole: role, systemKey: role }
    const existing = await getSystemRoleDoc(ctx, role)
    if (existing) await ctx.db.patch(existing._id, data)
    else await ctx.db.insert('roles', data)
  },
})

// Back to the name and pages from code.
export const resetSystemRole = mutation({
  args: { role: baseRoleValidator },
  handler: async (ctx, { role }) => {
    await requirePermission(ctx, '/app/settings', 'edit')
    const existing = await getSystemRoleDoc(ctx, role)
    if (existing) await ctx.db.delete(existing._id)
  },
})

export const createRole = mutation({
  args: {
    name:        v.string(),
    baseRole:    baseRoleValidator,
    pages:       v.array(v.string()),
    permissions: v.array(v.string()),
  },
  handler: async (ctx, { name, baseRole, pages, permissions }) => {
    await requirePermission(ctx, '/app/settings', 'edit')
    return ctx.db.insert('roles', { name: cleanName(name), baseRole, pages: cleanPages(pages), permissions: cleanPermissions(permissions, pages) })
  },
})

export const updateRole = mutation({
  args: {
    id:       v.id('roles'),
    name:        v.string(),
    baseRole:    baseRoleValidator,
    pages:       v.array(v.string()),
    permissions: v.array(v.string()),
  },
  handler: async (ctx, { id, name, baseRole, pages, permissions }) => {
    await requirePermission(ctx, '/app/settings', 'edit')
    const role = await ctx.db.get(id)
    if (!role || role.systemKey) throw new Error('Роль не знайдено')
    await ctx.db.patch(id, { name: cleanName(name), baseRole, pages: cleanPages(pages), permissions: cleanPermissions(permissions, pages) })
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
    await requirePermission(ctx, '/app/settings', 'edit')
    const role = await ctx.db.get(id)
    if (!role || role.systemKey) throw new Error('Роль не знайдено')
    const users = await ctx.db.query('users').withIndex('by_roleId', q => q.eq('roleId', id)).collect()
    for (const u of users) await ctx.db.patch(u._id, { roleId: undefined })
    await ctx.db.delete(id)
  },
})
