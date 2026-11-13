import {
  Mail, Phone, Cake, Briefcase, Clock, CheckCircle2, Timer, Wallet,
  TrendingUp, Banknote, History, KeyRound,
} from 'lucide-react'
import { type Doc } from 'convex/_generated/dataModel'
import { PAGE_LABELS, getRoleLabel, getUserPages } from '@/constants/page-roles'
import UserAvatar from '@/components/UserAvatar'
import { cn } from '@/lib/utils'

const SHADOW = 'shadow-[0px_0px_3px_#021b333d]'

export const ProfileCard = ({ title, icon, action, children, className }: {
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

type Props = {
  user: Doc<'users'> & { roleName?: string; rolePages?: string[] }
  topBar?: React.ReactNode
  badges?: React.ReactNode
  actions?: React.ReactNode
  pageAccessAction?: React.ReactNode
  children?: React.ReactNode
}

export const UserProfile = ({ user, topBar, badges, actions, pageAccessAction, children }: Props) => {
  const fullName = [user.name, user.lastName].filter(Boolean).join(' ') || 'Без імені'
  const userPages = getUserPages(user)

  return (
    <div className="flex h-full flex-col gap-2 overflow-hidden p-2">
      {topBar && <div className="flex shrink-0 items-center gap-2">{topBar}</div>}

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-1 lg:flex-row lg:overflow-hidden">
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
              {user.role ? (
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  {getRoleLabel(user)}
                </span>
              ) : (
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                  Роль не призначена
                </span>
              )}
              {badges}
            </div>
          </div>

          <div className="mx-5 my-4 border-t" />

          <div className="flex flex-col px-5">
            <InfoRow icon={<Mail size={14} />}      label="Email"                 value={user.email} />
            <InfoRow icon={<Phone size={14} />}     label="Телефон"               value={user.phone} />
            <InfoRow icon={<Cake size={14} />}      label="День народження"       value={user.birthday} />
            <InfoRow icon={<Briefcase size={14} />} label="Працює з"              value={user.startDate} />
            <InfoRow icon={<Clock size={14} />}     label="Робочих годин на день" value={user.workHours != null ? String(user.workHours) : null} />
          </div>

          {actions && <div className="mt-auto flex gap-2 p-5">{actions}</div>}
        </aside>

        <main className="flex min-w-0 flex-1 flex-col gap-3 lg:-my-1 lg:-mr-1 lg:overflow-y-auto lg:p-1">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <StatTile icon={<CheckCircle2 size={16} />} label="Виконано завдань"    hint="Кількість завершених завдань за місяць" />
            <StatTile icon={<Timer size={16} />}        label="Відпрацьовано годин" hint="Години за поточний місяць" />
            <StatTile icon={<TrendingUp size={16} />}   label="Ефективність"        hint="Факт проти нормативного часу" />
            <StatTile icon={<Wallet size={16} />}       label="Нараховано"          hint="Сума до виплати за місяць" />
          </div>

          <div className="grid gap-3 xl:grid-cols-3">
            <ProfileCard title="Зарплата" icon={<Banknote size={16} />} className="xl:col-span-2">
              <Placeholder
                className="min-h-56"
                text="Тут буде таблиця нарахувань і виплат по місяцях: ставка, відпрацьований час, премії, утримання, сума до виплати"
              />
            </ProfileCard>
            <ProfileCard title="Активність" icon={<History size={16} />}>
              <Placeholder className="min-h-56" text="Тут буде стрічка останніх дій користувача" />
            </ProfileCard>
          </div>

          <div className="grid gap-3 xl:grid-cols-2">
            <ProfileCard title="Доступ до сторінок" icon={<KeyRound size={16} />} action={pageAccessAction}>
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
            </ProfileCard>
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
