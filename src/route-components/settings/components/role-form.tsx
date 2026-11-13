import { useContext, useState } from 'react'
import { Loader2, RotateCcw, Trash2 } from 'lucide-react'
import { type Id } from 'convex/_generated/dataModel'
import { BASE_ROLES, ROLE_LABELS, type UserRole } from '@/constants/roles'
import { ALL_PAGES, PAGE_LABELS } from '@/constants/page-roles'
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

  const { mutate: updateSystem, isPending: isSavingSystem } = useUpdateSystemRole()
  const { mutate: resetSystem,  isPending: isResetting }    = useResetSystemRole()
  const { mutate: create,       isPending: isCreating }     = useCreateRole()
  const { mutate: update,       isPending: isUpdating }     = useUpdateRole()
  const { mutate: remove } = useDeleteRole()

  const isPending = isSavingSystem || isResetting || isCreating || isUpdating
  const isSystem  = role?.isSystem ?? false
  const done      = { onSuccess: () => closeDialog() }

  const toggle = (page: string, checked: boolean) =>
    setPages(prev => checked ? [...prev, page] : prev.filter(p => p !== page))

  const handleSave = () => {
    if (!name.trim()) return
    if (!role) return create({ name, baseRole, pages }, done)
    if (isSystem) return updateSystem({ role: role.key as BaseRole, name, pages }, done)
    update({ id: role.key as Id<'roles'>, name, baseRole, pages }, done)
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
            <Checkbox checked={pages.length === ALL_PAGES.length} onCheckedChange={v => setPages(v === true ? ALL_PAGES : [])} />
            Вибрати всі
          </label>
        </div>
        <div className="grid max-h-72 grid-cols-1 gap-0.5 overflow-y-auto rounded-md border p-1 sm:grid-cols-2">
          {ALL_PAGES.map(page => (
            <label key={page} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted">
              <Checkbox checked={pages.includes(page)} onCheckedChange={v => toggle(page, v === true)} />
              <span>{PAGE_LABELS[page] ?? page}</span>
            </label>
          ))}
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
