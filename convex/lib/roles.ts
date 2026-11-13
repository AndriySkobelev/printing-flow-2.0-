import type { Doc } from '../_generated/dataModel'

// Shared by the app (access checks, labels) and Convex (role defaults).
export type UserRole = NonNullable<Doc<'users'>['role']>

export const SUPER_ADMIN: UserRole = 'super_admin'

export const USER_ROLES: UserRole[] = [
  'super_admin',
  'admin',
  'manager',
  'seamstress',
  'tailor',
  'brander',
]

// Roles a custom role can build on — super_admin is never handed out that way.
export const BASE_ROLES = USER_ROLES.filter(r => r !== SUPER_ADMIN)

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Супер адмін',
  admin:       'Адмін',
  manager:     'Менеджер',
  seamstress:  'Швачка',
  tailor:      'Кравець',
  brander:     'Брендер',
}

// Default "who can see this page", keyed by route path. A role's pages edited
// in settings (the `roles` table) replace these; a user's `allowedPages`
// replaces both. super_admin is listed everywhere so it's never special-cased here.
export const PAGE_ROLES: Record<string, UserRole[]> = {
  '/app/production-orders':   [SUPER_ADMIN, 'admin', 'manager'],
  '/app/inventory-movement':  [SUPER_ADMIN, 'admin', 'manager'],
  '/app/stock-balance':       [SUPER_ADMIN, 'admin', 'manager'],
  '/app/suppliers':           [SUPER_ADMIN, 'admin', 'manager'],
  '/app/order-processing':    [SUPER_ADMIN, 'admin', 'manager'],
  '/app/workload':            [SUPER_ADMIN, 'admin', 'manager'],
  '/app/planner':             [SUPER_ADMIN, 'admin', 'manager'],
  '/app/production-cut':      [SUPER_ADMIN, 'admin', 'manager', 'tailor'],
  '/app/branding':            [SUPER_ADMIN, 'admin', 'manager', 'brander'],
  '/app/packing-list':        [SUPER_ADMIN, 'admin', 'manager'],
  '/app/sewing-tasks':        [SUPER_ADMIN, 'admin', 'seamstress'],
  '/app/materials':           [SUPER_ADMIN, 'admin'],
  '/app/fabrics':             [SUPER_ADMIN, 'admin'],
  '/app/specifications':      [SUPER_ADMIN, 'admin'],
  '/app/extra-works':         [SUPER_ADMIN, 'admin'],
  '/app/users':               [SUPER_ADMIN, 'admin'],
  '/app/settings':            [SUPER_ADMIN, 'admin'],
  '/app/products':            [SUPER_ADMIN, 'admin'],
  '/app/store':               [SUPER_ADMIN, 'admin'],
  '/app/production-calendar': [SUPER_ADMIN, 'admin', 'manager'],
  // profile is always reachable — handled in `canAccessPage`.
}

export const ALL_PAGES = Object.keys(PAGE_ROLES)

/** Pages a system role gets by default. */
export const getDefaultRolePages = (role: UserRole | undefined): string[] =>
  role ? ALL_PAGES.filter(p => PAGE_ROLES[p].includes(role)) : []

// ─── Actions within pages ────────────────────────────────────────────────────
// Seeing a page is page access (above). These are what a role may do there —
// checked in mutations (requirePermission) and used to hide buttons.

export type PageAction = 'create' | 'edit' | 'delete' | 'launch'

export const ACTION_LABELS: Record<PageAction, string> = {
  create: 'Додавання',
  edit:   'Редагування',
  delete: 'Видалення',
  launch: 'Запуск у виробництво',
}

export const PAGE_ACTIONS: Record<string, PageAction[]> = {
  '/app/production-orders':  ['create', 'edit', 'delete', 'launch'],
  '/app/inventory-movement': ['create'],
  '/app/suppliers':          ['create', 'edit', 'delete'],
  '/app/materials':          ['create', 'edit', 'delete'],
  '/app/fabrics':            ['create', 'edit', 'delete'],
  '/app/users':              ['edit', 'delete'],
  '/app/settings':           ['edit'],
}

export const permissionKey = (page: string, action: PageAction) => `${page}:${action}`

/** Every action on the given pages — what a role without saved permissions gets. */
export const allPermissions = (pages: string[]) =>
  pages.flatMap(page => (PAGE_ACTIONS[page] ?? []).map(action => permissionKey(page, action)))

// `rolePages`/`roleName`/`permissions` are resolved on the server (withRole).
// `permissions` missing = every action on the pages the user sees.
export type AccessUser = {
  role?:         UserRole
  allowedPages?: string[]
  rolePages?:    string[]
  roleName?:     string
  permissions?:  string[]
} | null | undefined

/** Effective pages: super_admin → all, the user's override → it, else the role's. */
export const getUserPages = (user: AccessUser): string[] => {
  if (!user) return []
  if (user.role === SUPER_ADMIN) return ALL_PAGES
  const pages = user.allowedPages ?? user.rolePages ?? getDefaultRolePages(user.role)
  return pages.filter(p => p in PAGE_ROLES)
}

export const can = (user: AccessUser, page: string, action: PageAction): boolean => {
  if (!user) return false
  if (user.role === SUPER_ADMIN) return true
  if (!getUserPages(user).includes(page)) return false
  return !user.permissions || user.permissions.includes(permissionKey(page, action))
}
