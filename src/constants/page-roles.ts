import { ROLE_LABELS, ALL_PAGES, PAGE_ROLES, getDefaultRolePages, getUserPages, type AccessUser } from 'convex/lib/roles'

export { PAGE_ROLES, ALL_PAGES, getUserPages }

export const PAGE_LABELS: Record<string, string> = {
  '/app/production-orders':   'Замовлення',
  '/app/inventory-movement':  'Рух матеріалів',
  '/app/stock-balance':       'Залишки',
  '/app/suppliers':           'Постачальники',
  '/app/order-processing':    'Обробка замовлень',
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

export type PageAccessUser = AccessUser

/** Pages the user's role gives (when the user has no override of their own). */
export const getRolePages = (user: PageAccessUser): string[] =>
  user?.rolePages ?? getDefaultRolePages(user?.role)

export const getRoleLabel = (user: PageAccessUser): string | null =>
  user?.roleName ?? (user?.role ? ROLE_LABELS[user.role] : null)

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
