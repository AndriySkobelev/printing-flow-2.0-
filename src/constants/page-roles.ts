import { SUPER_ADMIN, type UserRole } from '@/constants/roles'

// Single source of truth for "who can see this page".
// Keyed by the page's route path (as it appears in the URL, e.g. '/app/users').
// Nested/detail routes (e.g. '/app/production-orders/<id>') inherit their
// parent's roles automatically — see `canAccessPage`.
//
// `super_admin` is intentionally listed everywhere so it never has to be
// special-cased when reading this file.
export const PAGE_ROLES: Record<string, UserRole[]> = {
  '/app/production-orders':   [SUPER_ADMIN, 'admin', 'manager'],
  '/app/inventory-movement':  [SUPER_ADMIN, 'admin', 'manager'],
  '/app/stock-balance':       [SUPER_ADMIN, 'admin', 'manager'],
  '/app/workload':            [SUPER_ADMIN, 'admin', 'manager'],
  '/app/planner':             [SUPER_ADMIN, 'admin', 'manager'],
  '/app/production-cut':      [SUPER_ADMIN, 'admin', 'manager', 'tailor'],
  '/app/branding':            [SUPER_ADMIN, 'admin', 'manager', 'brander'],
  '/app/packing-list':        [SUPER_ADMIN, 'admin', 'manager'],
  '/app/sewing-tasks':        [SUPER_ADMIN, 'seamstress'],
  '/app/materials':           [SUPER_ADMIN, 'admin'],
  '/app/fabrics':             [SUPER_ADMIN, 'admin'],
  '/app/specifications':      [SUPER_ADMIN, 'admin'],
  '/app/users':                [SUPER_ADMIN, 'admin'],
  '/app/products':             [SUPER_ADMIN, 'admin'],
  '/app/store':                 [SUPER_ADMIN, 'admin'],
  '/app/production-calendar':  [SUPER_ADMIN, 'admin', 'manager'],
  // profile is always reachable, including by users without any role yet —
  // handled as a special case in `canAccessPage` rather than listed here.
}

/**
 * Whether `role` may access `pathname`.
 * - '/app/profile' is always allowed (even with no role at all).
 * - A role-less user can't access anything else.
 * - Detail/nested routes (e.g. '/app/production-orders/abc') inherit the
 *   roles of their closest mapped ancestor.
 * - Pages missing from PAGE_ROLES are denied by default.
 */
export const canAccessPage = (role: UserRole | undefined, pathname: string): boolean => {
  if (pathname === '/app/profile') return true
  if (!role) return false

  const matchedPath = Object.keys(PAGE_ROLES).find(
    path => pathname === path || pathname.startsWith(`${path}/`)
  )
  if (!matchedPath) return false

  return PAGE_ROLES[matchedPath].includes(role)
}

/**
 * Where to send a user who just got denied access to a page — the first
 * page (in PAGE_ROLES declaration order) their role is allowed to see,
 * falling back to '/app/profile' if their role matches nothing (or they
 * have no role at all).
 */
export const getFirstAccessiblePage = (role: UserRole | undefined): string => {
  if (!role) return '/app/profile'
  const path = Object.keys(PAGE_ROLES).find(p => PAGE_ROLES[p].includes(role))
  return path ?? '/app/profile'
}
