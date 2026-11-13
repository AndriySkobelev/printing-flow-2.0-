import { useContext } from 'react'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { ChevronRight, Plus, Users } from 'lucide-react'
import { api } from 'convex/_generated/api'
import { ROLE_LABELS } from '@/constants/roles'
import { ALL_PAGES } from '@/constants/page-roles'
import { DialogContext } from '@/contexts/dialog'
import { Button } from '@/components/ui/button'
import { RoleForm, type RoleItem } from './role-form'

export const RolesSection = () => {
  const { openDialog } = useContext(DialogContext)
  const { data: roles = [] } = useQuery(convexQuery(api.queries.roles.getRoles, {}))

  const openRole = (role?: RoleItem) =>
    openDialog({
      title:           role ? `Роль · ${role.name}` : 'Нова роль',
      className:       'sm:max-w-xl',
      hideCloseButton: true,
      noAutoFocus:     !!role,
      content:         <RoleForm role={role} />,
    })

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Ролі</span>
        <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => openRole()}>
          <Plus size={14} />
          <span>Додати роль</span>
        </Button>
      </div>
      <div className="flex flex-col divide-y rounded-md border border-primary/10 bg-primary/5">
        {roles.map(role => (
          <Button
            key={role.key}
            type="button"
            variant="ghost"
            className="h-auto justify-between gap-3 rounded-none px-4 py-2.5 text-left first:rounded-t-md last:rounded-b-md"
            onClick={() => openRole(role)}
          >
            <span className="flex min-w-0 flex-col items-start gap-0.5">
              <span className="text-sm font-semibold text-primary">{role.name}</span>
              <span className="text-xs font-normal text-muted-foreground">
                {role.isSystem
                  ? `Системна${role.isChanged ? ' · змінена' : ''}`
                  : `Права: ${ROLE_LABELS[role.baseRole]}`}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-3 text-xs font-normal text-muted-foreground tabular-nums">
              <span>{`${role.pages.length} / ${ALL_PAGES.length} стор.`}</span>
              <span className="flex items-center gap-1"><Users size={12} />{role.usersCount}</span>
              <ChevronRight size={14} />
            </span>
          </Button>
        ))}
      </div>
    </div>
  )
}
