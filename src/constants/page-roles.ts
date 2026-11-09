import { SUPER_ADMIN, type UserRole } from '@/constants/roles'

// Single source of truth for "who can see this page" by default.
// Keyed by the page's route path (as it appears in the URL, e.g. '/app/users').
// Nested/detail routes (e.g. '/app/production-orders/<id>') inherit their
// parent's access automatically — see `canAccessPage`.
//
// `super_admin` is intentionally listed everywhere so it never has to be
// special-cased when reading this file.
//
// A user's `allowedPages` (set on the users page) overrides these role
// defaults for that user.
export const PAGE_ROLES: Record<string, UserRole[]> = {
  '/app/production-orders':   [SUPER_ADMIN, 'admin', 'manager'],
  '/app/inventory-movement':  [SUPER_ADMIN, 'admin', 'manager'],
  '/app/stock-balance':       [SUPER_ADMIN, 'admin', 'manager'],
  '/app/suppliers':           [SUPER_ADMIN, 'admin', 'manager'],
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
  '/app/users':                [SUPER_ADMIN, 'admin'],
  '/app/settings':             [SUPER_ADMIN, 'admin'],
  '/app/products':             [SUPER_ADMIN, 'admin'],
  '/app/store':                 [SUPER_ADMIN, 'admin'],
  '/app/production-calendar':  [SUPER_ADMIN, 'admin', 'manager'],
  // profile is always reachable, including by users without any role yet —
  // handled as a special case in `canAccessPage` rather than listed here.
}

export const PAGE_LABELS: Record<string, string> = {
  '/app/production-orders':   'Замовлення',
  '/app/inventory-movement':  'Рух матеріалів',
  '/app/stock-balance':       'Залишки',
  '/app/suppliers':           'Постачальники',
  '/app/workload':            'Календар завантаження',
  '/app/planner':             'Планер пошиву',
  '/app/production-cut':      'Виробництво крою',
  '/app/branding':            'Брендування',
  '/app/packing-list':        'Пакування',
  '/app/sewing-tasks':        'Мої завдання',
  '/app/materials':           'Матеріали',
  '/app/fabrics':             'Тканини',
  '/app/specifications':      'Вироби (специфікації)',
  '/app/extra-works':         'Додаткові роботи',
  '/app/users':               'Користувачі',
  '/app/settings':            'Система',
  '/app/products':            'Товари',
  '/app/store':               'Склад',
  '/app/production-calendar': 'Виробничий календар',
}

export const ALL_PAGES = Object.keys(PAGE_ROLES)

export type PageAccessUser = {
  role?: UserRole
  allowedPages?: string[]
} | null | undefined

/** Pages a role gets by default (when the user has no override). */
export const getRolePages = (role: UserRole | undefined): string[] =>
  role ? ALL_PAGES.filter(p => PAGE_ROLES[p].includes(role)) : []

/** Effective pages for a user: super_admin → all, override → it, else role defaults. */
export const getUserPages = (user: PageAccessUser): string[] => {
  if (!user) return []
  if (user.role === SUPER_ADMIN) return ALL_PAGES
  if (user.allowedPages) return user.allowedPages.filter(p => p in PAGE_ROLES)
  return getRolePages(user.role)
}

/**
 * Whether `user` may access `pathname`.
 * - '/app/profile' is always allowed (even with no role at all).
 * - Detail/nested routes (e.g. '/app/production-orders/abc') inherit the
 *   access of their closest mapped ancestor.
 * - Pages missing from PAGE_ROLES are denied by default.
 */
export const canAccessPage = (user: PageAccessUser, pathname: string): boolean => {
  if (pathname === '/app/profile') return true

  const matchedPath = ALL_PAGES.find(
    path => pathname === path || pathname.startsWith(`${path}/`)
  )
  if (!matchedPath) return false

  return getUserPages(user).includes(matchedPath)
}

/**
 * Where to send a user who just got denied access to a page — the first
 * page (in PAGE_ROLES declaration order) they're allowed to see,
 * falling back to '/app/profile'.
 */
export const getFirstAccessiblePage = (user: PageAccessUser): string => {
  const pages = getUserPages(user)
  return ALL_PAGES.find(p => pages.includes(p)) ?? '/app/profile'
}
