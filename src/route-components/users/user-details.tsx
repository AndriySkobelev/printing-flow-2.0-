import { useContext } from 'react'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from 'convex/_generated/api'
import { useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Trash2, Pencil, Save } from 'lucide-react'
import { type Id } from 'convex/_generated/dataModel'
import { ROLE_LABELS, SUPER_ADMIN, USER_ROLES, type UserRole } from '@/constants/roles'
import { AuthContext } from '@/contexts/auth'
import { DialogContext } from '@/contexts/dialog'
import { Button } from '@/components/ui/button'
import { MyPopover } from '@/components/my-popover'
import { useCan } from '@/hooks/use-can'
import { Spinner } from '@/components/ui/spinner'
import { ProfileCard, UserProfile } from '@/components/user-profile'
import EditUserForm, { type EditUserFormType } from './forms/edit-user-form'
import SeamstressForm from './forms/seamstress-form'
import { PageAccessEditor } from './components/page-access-editor'
import { ApprovalBadge } from './components/approval-badge'
import { useGetUserById } from './queries'
import { useConfirmDeleteUser, useUpdateUser } from './actions'

const EDIT_FORM_ID = 'user-details-edit-form'
const SEAMSTRESS_FORM_ID = 'user-details-seamstress-form'

export const UserDetails = ({ userId }: { userId: Id<'users'> }) => {
  const navigate = useNavigate()
  const { user: me } = useContext(AuthContext)
  const { openDialog, closeDialog } = useContext(DialogContext)
  const { data: user, isLoading } = useGetUserById(userId)
  const { mutate: updateUser } = useUpdateUser()
  const confirmDelete = useConfirmDeleteUser()
  const can           = useCan()
  const canEdit       = can('/app/users', 'edit')
  const canDelete     = can('/app/users', 'delete')
  const { data: roles = [] } = useQuery(convexQuery(api.queries.roles.getRoles, {}))

  const goBack = () => navigate({ to: '/app/users' })

  if (isLoading) {
    return <div className="flex h-full items-center justify-center"><Spinner className="h-5 w-5" /></div>
  }

  if (!user) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <p className="text-sm text-muted-foreground">Користувача не знайдено</p>
        <Button variant="outline" size="sm" onClick={goBack}><ArrowLeft /> До списку</Button>
      </div>
    )
  }

  // Built-in roles go by their key, custom ones by id.
  const roleOptions = [
    { value: SUPER_ADMIN as string, label: ROLE_LABELS[SUPER_ADMIN] },
    ...roles.map(r => ({ value: r.key, label: r.name })),
  ]
  const toRoleData = (key?: string) =>
    !key ? {}
    : USER_ROLES.includes(key as UserRole) ? { role: key as UserRole }
    : { roleId: key as Id<'roles'> }

  const handleEdit = () => {
    const id = openDialog({
      title: 'Редагувати користувача',
      formId: EDIT_FORM_ID,
      withForm: true,
      content: (
        <EditUserForm
          formId={EDIT_FORM_ID}
          roleOptions={roleOptions}
          defaultValues={{
            name:      user.name      ?? '',
            lastName:  user.lastName  ?? '',
            phone:     user.phone     ?? '',
            birthday:  user.birthday  ?? '',
            workHours: user.workHours,
            startDate: user.startDate ?? '',
            role:      user.roleId ?? user.role,
          }}
          onSubmit={(values: EditUserFormType) =>
            updateUser(
              { id: user._id, data: { ...values, role: undefined, ...toRoleData(values.role) } },
              { onSuccess: () => closeDialog(id) },
            )
          }
        />
      ),
    })
  }

  const handleDelete = () => confirmDelete(user, goBack)

  return (
    <UserProfile
      user={user}
      topBar={
        <Button variant="ghost" size="sm" onClick={goBack}>
          <ArrowLeft /> Користувачі
        </Button>
      }
      badges={<ApprovalBadge user={user} canApprove={me?.role === SUPER_ADMIN} />}
      actions={
        <>
          {canEdit && (
            <Button className="flex-1" size="sm" onClick={handleEdit}>
              <Pencil size={14} /> Редагувати
            </Button>
          )}
          {canDelete && (
            <Button
              variant="outline"
              size="sm"
              className="text-red-500 hover:bg-red-50 hover:text-red-500"
              onClick={handleDelete}
            >
              <Trash2 size={14} />
            </Button>
          )}
        </>
      }
      pageAccessAction={canEdit &&
        <MyPopover
          trigger={
            <Button variant="ghost" size="icon" className="size-7">
              <Pencil size={14} />
            </Button>
          }
          content={<PageAccessEditor user={user} className="w-72" listClassName="max-h-64 overflow-y-auto pr-1" />}
        />
      }
    >
      {user.role === 'seamstress' && (
        <ProfileCard
          title="Час виготовлення специфікацій"
          action={canEdit && (
            <Button size="sm" className="h-7 text-xs" type="submit" form={SEAMSTRESS_FORM_ID}>
              <Save size={12} /> Зберегти
            </Button>
          )}
        >
          <SeamstressForm
            formId={SEAMSTRESS_FORM_ID}
            userId={user._id}
            existing={user.developingSpecification}
            className="flex max-h-80 flex-col gap-2 overflow-y-auto pr-1"
          />
        </ProfileCard>
      )}
    </UserProfile>
  )
}
