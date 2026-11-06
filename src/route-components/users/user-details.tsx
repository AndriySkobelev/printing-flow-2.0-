import { useContext } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  ArrowLeft, Trash2, Pencil, Mail, Phone, Cake, Briefcase, Clock,
  CheckCircle2, Timer, Wallet, TrendingUp, Banknote, History, Save, KeyRound,
} from 'lucide-react'
import { type Id } from 'convex/_generated/dataModel'
import { ROLE_LABELS, SUPER_ADMIN, type UserRole } from '@/constants/roles'
import { PAGE_LABELS, getUserPages } from '@/constants/page-roles'
import { AuthContext } from '@/contexts/auth'
import { DialogContext } from '@/contexts/dialog'
import { Button } from '@/components/ui/button'
import { MyPopover } from '@/components/my-popover'
import { Spinner } from '@/components/ui/spinner'
import UserAvatar from '@/components/UserAvatar'
import { cn } from '@/lib/utils'
import EditUserForm, { type EditUserFormType } from './forms/edit-user-form'
import SeamstressForm from './forms/seamstress-form'
import { PageAccessEditor } from './components/page-access-editor'
import { ApprovalBadge } from './components/approval-badge'
import { useGetUserById } from './queries'
import { useDeleteUser, useUpdateUser } from './actions'

const EDIT_FORM_ID = 'user-details-edit-form'
const SEAMSTRESS_FORM_ID = 'user-details-seamstress-form'

const SHADOW = 'shadow-[0px_0px_3px_#021b333d]'

const Card = ({ title, icon, action, children, className }: {
  title: string
  icon?: React.ReactNode
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}) => (
  <section className={cn('flex flex-col rounded-xl bg-background', SHADOW, className)}>
    <div className="flex items-center justify-between gap-2 px-4 py-3 border-b">
      <div className="flex items-center gap-2 text-sm font-semibold">
        {icon && <span className="text-primary/70">{icon}</span>}
        {title}
      </div>
      {action}
    </div>
    <div className="p-4">{children}</div>
  </section>
)

const Placeholder = ({ text, className }: { text: string; className?: string }) => (
  <div className={cn(
    'flex items-center justify-center rounded-lg border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground',
    className,
  )}>
    {text}
  </div>
)

const StatTile = ({ icon, label, hint }: { icon: React.ReactNode; label: string; hint: string }) => (
  <div className={cn('flex flex-col gap-3 rounded-xl bg-background p-4', SHADOW)}>
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</span>
    </div>
    <span className="text-2xl font-semibold text-muted-foreground/50">—</span>
    <span className="text-[11px] text-muted-foreground">{hint}</span>
  </div>
)

const InfoRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) => (
  <div className="flex items-center gap-3 py-2">
    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">{icon}</span>
    <div className="flex min-w-0 flex-col">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="truncate text-sm font-medium">{value || '—'}</span>
    </div>
  </div>
)

export const UserDetails = ({ userId }: { userId: Id<'users'> }) => {
  const navigate = useNavigate()
  const { user: me } = useContext(AuthContext)
  const { openDialog, closeDialog } = useContext(DialogContext)
  const { data: user, isLoading } = useGetUserById(userId)
  const { mutate: updateUser } = useUpdateUser()
  const { mutate: deleteUser, isPending: isDeleting } = useDeleteUser()

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

  const fullName = [user.name, user.lastName].filter(Boolean).join(' ') || 'Без імені'
  const userPages = getUserPages(user)

  const handleEdit = () => {
    const id = openDialog({
      title: 'Редагувати користувача',
      formId: EDIT_FORM_ID,
      withForm: true,
      content: (
        <EditUserForm
          formId={EDIT_FORM_ID}
          defaultValues={{
            name:      user.name      ?? '',
            lastName:  user.lastName  ?? '',
            phone:     user.phone     ?? '',
            birthday:  user.birthday  ?? '',
            workHours: user.workHours,
            startDate: user.startDate ?? '',
            role:      user.role,
          }}
          onSubmit={(values: EditUserFormType) =>
            updateUser(
              { id: user._id, data: { ...values, role: values.role as UserRole | undefined } },
              { onSuccess: () => closeDialog(id) },
            )
          }
        />
      ),
    })
  }

  const handleDelete = () => deleteUser({ id: user._id }, { onSuccess: goBack })

  return (
    <div className="flex h-full flex-col gap-2 overflow-hidden p-2">
      <div className="flex shrink-0 items-center gap-2">
        <Button variant="ghost" size="sm" onClick={goBack}>
          <ArrowLeft /> Користувачі
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-1 lg:flex-row lg:overflow-hidden">
        {/* ── Profile card ─────────────────────────────────────────────── */}
        <aside className={cn('flex shrink-0 flex-col overflow-hidden rounded-xl bg-background lg:w-80 lg:overflow-y-auto', SHADOW)}>
          <div className="h-24 shrink-0 bg-gradient-to-br from-primary to-primary/70" />
          <div className="-mt-10 flex flex-col items-center gap-2 px-5 text-center">
            <div className="rounded-full bg-primary p-1 ring-4 ring-background">
              <UserAvatar name={user.name} lastName={user.lastName} image={user.image} size="lg" />
            </div>
            <div className="flex flex-col gap-0.5">
              <h1 className="text-lg font-semibold leading-tight">{fullName}</h1>
              {user.email && <span className="text-xs text-muted-foreground">{user.email}</span>}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {user.role && (
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  {ROLE_LABELS[user.role]}
                </span>
              )}
              <ApprovalBadge user={user} canApprove={me?.role === SUPER_ADMIN} />
            </div>
          </div>

          <div className="mx-5 my-4 border-t" />

          <div className="flex flex-col px-5">
            <InfoRow icon={<Mail size={14} />}      label="Email"            value={user.email} />
            <InfoRow icon={<Phone size={14} />}     label="Телефон"          value={user.phone} />
            <InfoRow icon={<Cake size={14} />}      label="День народження"  value={user.birthday} />
            <InfoRow icon={<Briefcase size={14} />} label="Працює з"         value={user.startDate} />
            <InfoRow icon={<Clock size={14} />}     label="Робочих годин на день" value={user.workHours != null ? String(user.workHours) : null} />
          </div>

          <div className="mt-auto flex gap-2 p-5">
            <Button className="flex-1" size="sm" onClick={handleEdit}>
              <Pencil size={14} /> Редагувати
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-red-500 hover:bg-red-50 hover:text-red-500"
              disabled={isDeleting}
              onClick={handleDelete}
            >
              <Trash2 size={14} />
            </Button>
          </div>
        </aside>

        {/* ── Main ─────────────────────────────────────────────────────── */}
        <main className="flex min-w-0 flex-1 flex-col gap-3 lg:-my-1 lg:-mr-1 lg:overflow-y-auto lg:p-1">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <StatTile icon={<CheckCircle2 size={16} />} label="Виконано завдань"    hint="Кількість завершених завдань за місяць" />
            <StatTile icon={<Timer size={16} />}        label="Відпрацьовано годин" hint="Години за поточний місяць" />
            <StatTile icon={<TrendingUp size={16} />}   label="Ефективність"        hint="Факт проти нормативного часу" />
            <StatTile icon={<Wallet size={16} />}       label="Нараховано"          hint="Сума до виплати за місяць" />
          </div>

          <div className="grid gap-3 xl:grid-cols-3">
            <Card title="Зарплата" icon={<Banknote size={16} />} className="xl:col-span-2">
              <Placeholder
                className="min-h-56"
                text="Тут буде таблиця нарахувань і виплат по місяцях: ставка, відпрацьований час, премії, утримання, сума до виплати"
              />
            </Card>
            <Card title="Активність" icon={<History size={16} />}>
              <Placeholder className="min-h-56" text="Тут буде стрічка останніх дій користувача" />
            </Card>
          </div>

          <div className="grid gap-3 xl:grid-cols-2">
            <Card
              title="Доступ до сторінок"
              icon={<KeyRound size={16} />}
              action={
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
              {userPages.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {userPages.map(page => (
                    <span key={page} className="rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                      {PAGE_LABELS[page] ?? page}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">Немає доступних сторінок</span>
              )}
            </Card>

            {user.role === 'seamstress' && (
              <Card
                title="Час виготовлення специфікацій"
                action={
                  <Button size="sm" className="h-7 text-xs" type="submit" form={SEAMSTRESS_FORM_ID}>
                    <Save size={12} /> Зберегти
                  </Button>
                }
              >
                <SeamstressForm
                  formId={SEAMSTRESS_FORM_ID}
                  userId={user._id}
                  existing={user.developingSpecification}
                  className="flex max-h-80 flex-col gap-2 overflow-y-auto pr-1"
                />
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
