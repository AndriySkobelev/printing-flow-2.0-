import { useState } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowLeftRight,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Layers,
  Menu,
  PackageSearch,
  Scissors,
  PaintRoller,
  Waypoints,
  ScissorsLineDashedIcon,
  Settings,
  Wand2,
  CalendarRange,
  ShoppingBag,
  Users,
  Warehouse,
  X,
} from 'lucide-react'
import { useAuth } from '@/hooks/auth-hooks'
import { SUPER_ADMIN, type UserRole } from '@/constants/roles'
import UserAvatar from '@/components/UserAvatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
// --- nav config -----------------------------------------------------------

type NavChildLink = {
  label: string
  to: string
  icon?: LucideIcon
  roles?: UserRole[]
}

type NavSubGroup = {
  type: 'subgroup'
  label: string
  roles?: UserRole[]
  children: NavChildLink[]
}

type NavGroupEntry = NavChildLink | NavSubGroup

type NavLink = {
  type: 'link'
  label: string
  to: string
  icon?: LucideIcon
  roles?: UserRole[]
}

type NavGroup = {
  type: 'group'
  label: string
  icon?: LucideIcon
  roles?: UserRole[]
  children: NavGroupEntry[]
}

type NavItem = NavLink | NavGroup

const navConfig: NavItem[] = [
  {
    type: 'link',
    label: 'Замовлення',
    to:    '/app/production-orders',
    icon:  PackageSearch,
  },
  {
    type: 'group',
    label: 'Склад',
    icon: Warehouse,
    children: [
      { to: '/app/inventory-movement', label: 'Рух матеріалів', icon: ArrowLeftRight },
      {
        type: 'subgroup',
        label: 'Матеріали',
        children: [
          { to: '/app/materials', label: 'Матеріали', icon: Layers   },
          { to: '/app/fabrics',   label: 'Тканини',   icon: Scissors },
        ],
      },
      {
        type: 'subgroup',
        label: 'Продукція',
        children: [
          { to: '/app/products',       label: 'Товари',       icon: ShoppingBag   },
          { to: '/app/specifications', label: 'Специфікації', icon: ClipboardList },
        ],
      },
    ],
  },
  {
    type: 'group',
    label: 'Виробництво',
    icon: CalendarDays,
    children: [
      { to: '/app/workload',        label: 'Календар завантаження',  icon: CalendarRange           },
      { to: '/app/planner',         label: 'Планер пошиву',          icon: Waypoints               },
      { to: '/app/production-cut',  label: 'Виробництво крою',       icon: ScissorsLineDashedIcon  },
      { to: '/app/branding',        label: 'Брендування',            icon: PaintRoller             },
      { to: '/app/sewing-tasks',    label: 'Мої завдання',           icon: Wand2, roles: ['seamstress', 'tailor'] },
    ],
  },
  {
    type: 'link',
    label: 'Користувачі',
    to: '/app/users',
    icon: Users,
    roles: ['admin', 'super_admin'],
  },
  {
    type: 'link',
    label: 'Адмін',
    to: '/app/admin',
    icon: Settings,
    roles: ['admin', 'super_admin'],
  },
]

// --- styles ---------------------------------------------------------------

const linkCls = (active: boolean) =>
  `px-2 py-1 rounded-md text-sm font-light transition-colors flex items-center gap-1.5 ${
    active
      ? 'bg-white/20 text-white'
      : 'text-white/70 hover:text-white hover:bg-white/10'
  }`

const dropdownItemCls = (active: boolean) =>
  `w-full cursor-pointer rounded-sm px-3 py-2 text-sm transition-colors flex items-center gap-2 ${
    active
      ? 'bg-white/20 text-white font-medium'
      : 'text-white/90 hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white'
  }`

// --- helpers ---------------------------------------------------------------

const isSubGroup = (entry: NavGroupEntry): entry is NavSubGroup =>
  (entry as NavSubGroup).type === 'subgroup'

const isGroupActive = (children: NavGroupEntry[], pathname: string): boolean =>
  children.some(entry =>
    isSubGroup(entry)
      ? entry.children.some(c => pathname === c.to)
      : pathname === entry.to
  )

// --- desktop sub-components -----------------------------------------------

const Logo = () => <img src="/white-logo.svg" alt="PrintFlow" className="h-8 w-auto" />

const NavLinkItem = ({ item }: { item: NavLink }) => {
  const location = useLocation()
  const Icon = item.icon
  return (
    <Link to={item.to as any} className={linkCls(location.pathname === item.to)}>
      {Icon && <Icon className="size-3.5" />}
      {item.label}
    </Link>
  )
}

const NavGroupItem = ({ item }: { item: NavGroup }) => {
  const location = useLocation()
  const active = isGroupActive(item.children, location.pathname)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className={linkCls(active) + ' outline-none'}>
          {item.icon && <item.icon className="size-3.5" />}
          {item.label}
          <ChevronDown className="size-3.5 transition-transform duration-200 [[data-state=open]_&]:rotate-180" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="bg-primary border-white/10 text-white min-w-[13rem] p-1"
      >
        {item.children.map((entry, i) => (
          <span key={isSubGroup(entry) ? entry.label : entry.to}>
            {i > 0 && <DropdownMenuSeparator className="bg-white/10 my-1 w-[95%] mx-auto" />}
            {isSubGroup(entry) ? (
              <DropdownMenuGroup>
                {entry.children.map(child => {
                  const Icon = child.icon
                  return (
                    <DropdownMenuItem key={child.to} asChild>
                      <Link to={child.to as any} className={dropdownItemCls(location.pathname === child.to)}>
                        {Icon && <Icon className="size-3.5 shrink-0 text-inherit" />}
                        {child.label}
                      </Link>
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuGroup>
            ) : (
              <DropdownMenuItem asChild>
                <Link to={entry.to as any} className={dropdownItemCls(location.pathname === entry.to)}>
                  {entry.icon && <entry.icon className="size-3.5 shrink-0 text-inherit" />}
                  {entry.label}
                </Link>
              </DropdownMenuItem>
            )}
          </span>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// --- mobile sub-components ------------------------------------------------

const MobileNavGroup = ({ item, onNavigate }: { item: NavGroup; onNavigate: () => void }) => {
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const active = isGroupActive(item.children, location.pathname)

  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors ${
          active ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
        }`}
      >
        <span className="flex items-center gap-2">
          {item.icon && <item.icon className="size-4" />}
          {item.label}
        </span>
        <ChevronRight className={`size-4 transition-transform duration-200 ${open ? 'rotate-90' : ''}`} />
      </button>

      {open && (
        <div className="mt-1 ml-4 flex flex-col gap-0.5 border-l border-white/10 pl-3">
          {item.children.map(entry => {
            if (isSubGroup(entry)) {
              return (
                <div key={entry.label}>
                  <p className="text-[11px] text-white/40 uppercase tracking-wider px-2 py-1.5">{entry.label}</p>
                  {entry.children.map(child => {
                    const Icon = child.icon
                    const isActive = location.pathname === child.to
                    return (
                      <Link
                        key={child.to}
                        to={child.to as any}
                        onClick={onNavigate}
                        className={`flex items-center gap-2 px-2 py-2 rounded-lg text-sm transition-colors ${
                          isActive ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {Icon && <Icon className="size-3.5" />}
                        {child.label}
                      </Link>
                    )
                  })}
                </div>
              )
            }
            const Icon = entry.icon
            const isActive = location.pathname === entry.to
            return (
              <Link
                key={entry.to}
                to={entry.to as any}
                onClick={onNavigate}
                className={`flex items-center gap-2 px-2 py-2 rounded-lg text-sm transition-colors ${
                  isActive ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                {Icon && <Icon className="size-3.5" />}
                {entry.label}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

const MobileMenu = ({ open, onClose, canSee, user }: {
  open: boolean
  onClose: () => void
  canSee: (roles?: UserRole[]) => boolean
  user: ReturnType<typeof useAuth>['user']
}) => {
  const location = useLocation()

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 md:hidden ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 left-0 bottom-0 z-50 w-72 bg-primary flex flex-col transition-transform duration-300 ease-in-out md:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
          <Link to="/app" onClick={onClose}>
            <Logo />
          </Link>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
            <X className="size-5 text-white/70" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto p-3 flex flex-col gap-1">
          {navConfig.map(item => {
            if (!canSee(item.roles)) return null

            if (item.type === 'link') {
              const Icon = item.icon
              const isActive = location.pathname === item.to
              return (
                <Link
                  key={item.to}
                  to={item.to as any}
                  onClick={onClose}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    isActive ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {Icon && <Icon className="size-4" />}
                  {item.label}
                </Link>
              )
            }

            const visibleChildren = item.children.filter(c => canSee(c.roles))
            if (!visibleChildren.length) return null

            return (
              <MobileNavGroup
                key={item.label}
                item={{ ...item, children: visibleChildren }}
                onNavigate={onClose}
              />
            )
          })}
        </nav>

        {/* User section */}
        {user && (
          <div className="border-t border-white/10 p-3">
            <Link
              to={'/app/profile' as any}
              onClick={onClose}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <UserAvatar
                showName
                showRole
                size="sm"
                nameColor='white'
                name={user.name}
                role={user.role}
                image={user.image}
                lastName={user.lastName}
              />
            </Link>
          </div>
        )}
      </div>
    </>
  )
}

// --- Header ---------------------------------------------------------------

const Header = () => {
  const { user } = useAuth()
  const userRole: UserRole | undefined = user?.role
  const [mobileOpen, setMobileOpen] = useState(false)

  const canSee = (roles?: UserRole[]) =>
    !roles || userRole === SUPER_ADMIN || roles.includes(userRole!)

  return (
    <>
      <nav className="w-[98vw] mx-auto my-2 bg-primary rounded-xl text-white px-4 md:px-6 py-3 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/app" className="shrink-0 mr-2">
          <Logo />
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1 bg-primary px-4 py-2 rounded-xl">
          {navConfig.map(item => {
            if (!canSee(item.roles)) return null

            if (item.type === 'link') return <NavLinkItem key={item.to} item={item} />

            const visibleChildren = item.children.filter(c => canSee(c.roles))
            if (!visibleChildren.length) return null

            return <NavGroupItem key={item.label} item={{ ...item, children: visibleChildren }} />
          })}
        </div>

        {/* Desktop user */}
        {user && (
          <Link
            to={'/app/profile' as any}
            className="hidden md:flex items-center gap-2.5 px-2 py-1 rounded-md hover:bg-white/10 transition-colors shrink-0"
          >
            <UserAvatar name={user.name} role={user.role} lastName={user.lastName} image={user.image} size="sm" showName showRole />
          </Link>
        )}

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(true)}
          className="md:hidden ml-auto p-1.5 rounded-lg hover:bg-white/10 transition-colors"
        >
          <Menu className="size-5 text-white/90" />
        </button>
      </nav>

      <MobileMenu
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        canSee={canSee}
        user={user}
      />
    </>
  )
}

export default Header
