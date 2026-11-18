import { type Id } from 'convex/_generated/dataModel'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/check-box'
import { SUPER_ADMIN, type UserRole } from '@/constants/roles'
import { ALL_PAGES, PAGE_LABELS, getRolePages, getUserPages } from '@/constants/page-roles'
import { cn } from '@/lib/utils'
import { useUpdateUserPages } from '../actions'

export type PageAccessUser = {
  _id: Id<'users'>
  role?: UserRole
  allowedPages?: string[]
  rolePages?: string[]
}

type Props = {
  user: PageAccessUser
  className?: string
  listClassName?: string
}

export const PageAccessEditor = ({ user, className, listClassName }: Props) => {
  const { mutate: savePages, isPending } = useUpdateUserPages()
  const isSuperAdmin = user.role === SUPER_ADMIN
  const isCustom = !!user.allowedPages && !isSuperAdmin
  const pages = getUserPages(user)
  const rolePages = getRolePages(user)

  const disabled = isSuperAdmin || isPending
  const allSelected = pages.length === ALL_PAGES.length

  const toggle = (page: string, checked: boolean) => {
    const next = checked ? [...pages, page] : pages.filter(p => p !== page)
    savePages({ id: user._id, allowedPages: ALL_PAGES.filter(p => next.includes(p)) })
  }

  const toggleAll = (checked: boolean) =>
    savePages({ id: user._id, allowedPages: checked ? ALL_PAGES : [] })

  const resetToRole = () => savePages({ id: user._id, allowedPages: undefined })

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center justify-between gap-3">
        <label className={cn('flex items-center gap-2 px-2 py-1.5 text-sm font-medium', disabled ? 'opacity-70' : 'cursor-pointer')}>
          <Checkbox checked={allSelected} disabled={disabled} onCheckedChange={(v) => toggleAll(v === true)} />
          Вибрати всі
        </label>
        {isCustom && (
          <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" disabled={isPending} onClick={resetToRole}>
            <RotateCcw size={12} /> За роллю
          </Button>
        )}
      </div>
      <div className={cn('flex flex-col gap-0.5 border-t pt-1', listClassName)}>
        {ALL_PAGES.map(page => {
          const checked = pages.includes(page)
          const differsFromRole = isCustom && checked !== rolePages.includes(page)
          return (
            <label
              key={page}
              className={cn(
                'flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted cursor-pointer',
                disabled && 'cursor-default opacity-70',
              )}
            >
              <Checkbox
                checked={checked}
                disabled={disabled}
                onCheckedChange={(v) => toggle(page, v === true)}
              />
              <span className="flex-1">{PAGE_LABELS[page] ?? page}</span>
              {differsFromRole && <span className="size-1.5 rounded-full bg-amber-500" title="Відрізняється від ролі" />}
            </label>
          )
        })}
      </div>
    </div>
  )
}

export const PageAccessSummary = ({ user }: { user: PageAccessUser }) => {
  const count = getUserPages(user).length
  const isCustom = !!user.allowedPages && user.role !== SUPER_ADMIN
  return (
    <span className="flex items-center gap-1.5 text-xs">
      <span>{count} / {ALL_PAGES.length}</span>
      <span className={cn('rounded px-1.5 py-0.5', isCustom ? 'bg-amber-100 text-amber-800' : 'bg-muted text-muted-foreground')}>
        {isCustom ? 'індивідуально' : 'за роллю'}
      </span>
    </span>
  )
}
