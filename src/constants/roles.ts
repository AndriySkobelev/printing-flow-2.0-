import type { Doc } from 'convex/_generated/dataModel'

// Derived from the Convex schema — stays in sync automatically after `npx convex dev`
export type UserRole = NonNullable<Doc<'users'>['role']>

export const USER_ROLES: UserRole[] = [
  'super_admin',
  'admin',
  'manager',
  'seamstress',
  'tailor',
  'brander',
]

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Супер адмін',
  admin:       'Адмін',
  manager:     'Менеджер',
  seamstress:  'Швачка',
  tailor:      'Кравець',
  brander:     'Брендер',
}

export const SUPER_ADMIN: UserRole = 'super_admin'