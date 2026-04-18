import { Link, useLocation } from '@tanstack/react-router'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowLeftRight,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  Layers,
  Printer,
  Scissors,
  Settings,
  ShoppingBag,
} from 'lucide-react'
import { useAuth } from '@/hooks/auth-hooks'
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
  role?: string
}

type NavSubGroup = {
  type: 'subgroup'
  label: string
  role?: string
  children: NavChildLink[]
}

type NavGroupEntry = NavChildLink | NavSubGroup

type NavLink = {
  type: 'link'
  label: string
  to: string
  icon?: LucideIcon
  role?: string
}

type NavGroup = {
  type: 'group'
  label: string
  role?: string
  children: NavGroupEntry[]
}

type NavItem = NavLink | NavGroup

const navConfig: NavItem[] = [
  {
    type: 'group',
    label: 'Склад',
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
          { to: '/app/products',       label: 'Товари',        icon: ShoppingBag  },
          { to: '/app/specifications', label: 'Специфікації',  icon: ClipboardList },
        ],
      },
    ],
  },
  {
    type: 'link',
    label: 'Планер',
    to: '/app/planner',
    icon: CalendarDays,
  },
  {
    type: 'link',
    label: 'Адмін',
    to: '/app/admin',
    icon: Settings,
    role: 'admin',
  },
]

// --- styles ---------------------------------------------------------------

const linkCls = (active: boolean) =>
  `px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
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

// --- sub-components -------------------------------------------------------

function NavLinkItem({ item }: { item: NavLink }) {
  const location = useLocation()
  const Icon = item.icon
  return (
    <Link to={item.to as any} className={linkCls(location.pathname === item.to)}>
      {Icon && <Icon className="size-3.5" />}
      {item.label}
    </Link>
  )
}

function isSubGroup(entry: NavGroupEntry): entry is NavSubGroup {
  return (entry as NavSubGroup).type === 'subgroup'
}

function isGroupActive(children: NavGroupEntry[], pathname: string): boolean {
  return children.some(entry =>
    isSubGroup(entry)
      ? entry.children.some(c => pathname === c.to)
      : pathname === entry.to
  )
}

function NavGroupItem({ item }: { item: NavGroup }) {
  const location = useLocation()
  const active = isGroupActive(item.children, location.pathname)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className={linkCls(active) + ' outline-none'}>
          {item.label}
          <ChevronDown className="size-3.5 transition-transform duration-200 [[data-state=open]_&]:rotate-180" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="bg-[#0a3347] border-white/10 text-white min-w-[13rem] p-1"
      >
        {item.children.map((entry, i) => (
          <span key={isSubGroup(entry) ? entry.label : entry.to}>
            {i > 0 && <DropdownMenuSeparator className="bg-white/10 my-1 w-[95%] mx-auto"/>}

            {isSubGroup(entry) ? (
              <DropdownMenuGroup>
                {entry.children.map(child => {
                  const Icon = child.icon
                  return (
                    <DropdownMenuItem key={child.to} asChild>
                      <Link
                        to={child.to as any}
                        className={dropdownItemCls(location.pathname === child.to)}
                      >
                        {Icon && <Icon className="size-3.5 shrink-0 text-inherit" />}
                        {child.label}
                      </Link>
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuGroup>
            ) : (
              <DropdownMenuItem asChild>
                <Link
                  to={entry.to as any}
                  className={dropdownItemCls(location.pathname === entry.to)}
                >
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

function UserAvatar({ name, image }: { name?: string; image?: string }) {
  if (image) {
    return (
      <img
        src={image}
        alt={name}
        className="size-8 rounded-full object-cover ring-2 ring-white/20"
      />
    )
  }
  const initials = name
    ?.split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? '?'

  return (
    <span className="size-8 rounded-full bg-white/20 ring-2 ring-white/10 flex items-center justify-center text-xs font-semibold text-white select-none">
      {initials}
    </span>
  )
}

// --- Header ---------------------------------------------------------------

export default function Header() {
  const { user } = useAuth()
  const userRole: string | undefined = user?.role

  const canSee = (role?: string) => !role || role === userRole

  return (
    <nav className="w-full max-w-screen bg-[#002131] text-white px-6 py-3 flex items-center justify-between gap-4">
      {/* Logo */}
      <Link to="/app" className="flex items-center gap-2 shrink-0 mr-2">
        <Printer className="size-5 text-white/90" />
        <span className="text-sm font-semibold tracking-wide text-white/90">
          PrintFlow
        </span>
      </Link>

      {/* Nav */}
      <div className="flex items-center gap-1">
        {navConfig.map(item => {
          if (!canSee(item.role)) return null

          if (item.type === 'link') {
            return <NavLinkItem key={item.to} item={item} />
          }

          const visibleChildren = item.children.filter(c => canSee(c.role))
          if (!visibleChildren.length) return null

          return <NavGroupItem key={item.label} item={{ ...item, children: visibleChildren }} />
        })}
      </div>

      {/* User section */}
      {user && (
        <Link
          to={'/app/profile' as any}
          className="flex items-center gap-2.5 px-2 py-1 rounded-md hover:bg-white/10 transition-colors shrink-0"
        >
          <UserAvatar name={user?.name} image={user?.image} />
          <div className="flex flex-col leading-tight text-right">
            <span className="text-sm font-medium text-white truncate max-w-[120px]">
              {user.name}
            </span>
            <span className="text-xs text-white/50 capitalize">{user.role}</span>
          </div>
        </Link>
      )}
    </nav>
  )
}