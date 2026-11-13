import { useContext, useState } from 'react'
import { Loader2, RotateCcw, Trash2 } from 'lucide-react'
import { type Id } from 'convex/_generated/dataModel'
import { BASE_ROLES, ROLE_LABELS, type UserRole } from '@/constants/roles'
import { ALL_PAGES, PAGE_LABELS } from '@/constants/page-roles'
import { ACTION_LABELS, PAGE_ACTIONS, allPermissions, permissionKey } from 'convex/lib/roles'
import { DialogContext } from '@/contexts/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/check-box'
import { cn } from '@/lib/utils'
import { useCreateRole, useDeleteRole, useResetSystemRole, useUpdateRole, useUpdateSystemRole } from '../actions'

type BaseRole = Exclude<UserRole, 'super_admin'>

export type RoleItem = {
  key:        string
  name:       string
  pages:      string[]
  permissions: string[]
  baseRole:   BaseRole
  isSystem:   boolean
  isChanged:  boolean
  usersCount: number
}

// `role` missing → a new custom role.
export const RoleForm = ({ role }: { role?: RoleItem }) => {
  const { openDialog, closeDialog } = useContext(DialogContext)
  const [name, setName]         = useState(role?.name ?? '')
  const [baseRole, setBaseRole] = useState<BaseRole>(role?.baseRole ?? 'manager')
  const [pages, setPages]       = useState<string[]>(role?.pages ?? [])
  const [permissions, setPermissions] = useState<string[]>(role?.permissions ?? [])

  const { mutate: updateSystem, isPending: isSavingSystem } = useUpdateSystemRole()
  const { mutate: resetSystem,  isPending: isResetting }    = useResetSystemRole()
  const { mutate: create,       isPending: isCreating }     = useCreateRole()
  const { mutate: update,       isPending: isUpdating }     = useUpdateRole()
  const { mutate: remove } = useDeleteRole()

  const isPending = isSavingSystem || isResetting || isCreating || isUpdating
  const isSystem  = role?.isSystem ?? false
  const done      = { onSuccess: () => closeDialog() }

  // Opening a page gives all its actions; closing it takes them away.
  const togglePage = (page: string, checked: boolean) => {
    const keys = allPermissions([page])
    setPages(prev => checked ? [...prev, page] : prev.filter(p => p !== page))
    setPermissions(prev => checked ? [...new Set([...prev, ...keys])] : prev.filter(k => !keys.includes(k)))
  }

  const toggleAll = (checked: boolean) => {
    setPages(checked ? ALL_PAGES : [])
    setPermissions(checked ? allPermissions(ALL_PAGES) : [])
  }

  const toggleAction = (key: string, checked: boolean) =>
    setPermissions(prev => checked ? [...prev, key] : prev.filter(k => k !== key))

  const handleSave = () => {
    if (!name.trim()) return
    if (!role) return create({ name, baseRole, pages, permissions }, done)
    if (isSystem) return updateSystem({ role: role.key as BaseRole, name, pages, permissions }, done)
    update({ id: role.key as Id<'roles'>, name, baseRole, pages, permissions }, done)
  }

  const handleDelete = () => {
    if (!role) return
    const confirmId = openDialog({
      title:       `Видалити роль «${role.name}»?`,
      description: role.usersCount > 0
        ? `${role.usersCount} користувач(ів) отримають роль «${ROLE_LABELS[role.baseRole]}».`
        : 'Цю дію не можна скасувати.',
      content:      null,
      withForm:     true,
      actionSubmit: () => remove({ id: role.key as Id<'roles'> }, {
        onSuccess: () => { closeDialog(confirmId); closeDialog() },
      }),
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">Назва</span>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Напр. Старша швачка" className="h-10" />
      </div>

      {!isSystem && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Права як у ролі</span>
          <div className="flex flex-wrap gap-1">
            {BASE_ROLES.map(r => (
              <Button
                key={r}
                type="button"
                size="sm"
                variant={baseRole === r ? 'default' : 'outline'}
                className="h-7 text-xs"
                onClick={() => setBaseRole(r as BaseRole)}
              >
                {ROLE_LABELS[r]}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">{`Сторінки (${pages.length} / ${ALL_PAGES.length})`}</span>
          <label className="flex cursor-pointer items-center gap-2 text-xs">
            <Checkbox checked={pages.length === ALL_PAGES.length} onCheckedChange={v => toggleAll(v === true)} />
            Вибрати всі
          </label>
        </div>
        <div className="flex max-h-96 flex-col gap-0.5 overflow-y-auto rounded-md border p-1">
          {ALL_PAGES.map(page => {
            const isOpen = pages.includes(page)
            return (
              <div key={page} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded px-2 py-1.5 hover:bg-muted">
                <label className="flex min-w-44 flex-1 cursor-pointer items-center gap-2 text-sm">
                  <Checkbox checked={isOpen} onCheckedChange={v => togglePage(page, v === true)} />
                  <span>{PAGE_LABELS[page] ?? page}</span>
                </label>
                {(PAGE_ACTIONS[page] ?? []).map(action => {
                  const key = permissionKey(page, action)
                  return (
                    <label key={key} className={cn('flex items-center gap-1.5 text-xs', isOpen ? 'cursor-pointer' : 'opacity-40')}>
                      <Checkbox
                        checked={isOpen && permissions.includes(key)}
                        disabled={!isOpen}
                        onCheckedChange={v => toggleAction(key, v === true)}
                      />
                      <span>{ACTION_LABELS[action]}</span>
                    </label>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {role && !isSystem && (
          <Button type="button" variant="outline" className="h-10 text-red-500 hover:bg-red-50 hover:text-red-500" onClick={handleDelete}>
            <Trash2 size={14} />
          </Button>
        )}
        {isSystem && role?.isChanged && (
          <Button
            type="button"
            variant="outline"
            className="h-10"
            disabled={isPending}
            onClick={() => resetSystem({ role: role.key as BaseRole }, done)}
          >
            <RotateCcw size={14} />
            <span>Стандартна</span>
          </Button>
        )}
        <Button type="button" className={cn('h-10 flex-1')} disabled={!name.trim() || isPending} onClick={handleSave}>
          {isPending && <Loader2 className="size-4 animate-spin" />}
          <span>{role ? 'Зберегти' : 'Створити роль'}</span>
        </Button>
      </div>
    </div>
  )
}
