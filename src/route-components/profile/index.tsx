import { useContext } from 'react'
import { Briefcase, Calendar, Clock, Mail, Pencil, Phone, Shield, User } from 'lucide-react'
import { useAuth } from '@/hooks/auth-hooks'
import { ROLE_LABELS, type UserRole } from '@/constants/roles'
import Divider from '@/components/ui/divider'
import UserAvatar from '@/components/UserAvatar'
import { Button } from '@/components/ui/button'
import { DialogContext } from '@/contexts/dialog'
import UpdateProfileForm, { type UpdateProfileFormType } from './forms/update-profile-form'
import { useUpdateProfile } from './queries'

const FORM_ID = 'update-profile-form'

type Field = {
  icon: React.ReactNode
  label: string
  value: string | null | undefined
}

function FieldRow({ icon, label, value = '-' }: Field) {
  console.log("🚀 ~ FieldRow ~ value:", typeof value )
  return (
    <div className="flex items-center gap-3 py-2.5">
      <span className="text-primary/60 shrink-0">{icon}</span>
      <span className="text-xs text-muted-foreground w-28 shrink-0">{label}</span>
      <span className="text-sm font-medium text-foreground">{value ?? '-'}</span>
    </div>
  )
}

export default function ProfileCard() {
  const { user } = useAuth()
  const { openDialog, closeDialog } = useContext(DialogContext)
  const { mutate: updateProfile } = useUpdateProfile()

  if (!user) return null

  const roleLabel = user.role
    ? (ROLE_LABELS[user.role as UserRole] ?? String(user.role))
    : null
  console.log('user.startDate', user.startDate)
  const fields: Field[] = [
    { icon: <User size={14} />,      label: "Ім'я",            value: user.name },
    { icon: <User size={14} />,      label: 'Прізвище',        value: user.lastName },
    { icon: <Mail size={14} />,      label: 'Email',           value: user.email },
    { icon: <Phone size={14} />,     label: 'Телефон',         value: user.phone },
    { icon: <Shield size={14} />,    label: 'Роль',            value: roleLabel },
    { icon: <Calendar size={14} />,  label: 'День народження', value: user.birthday },
    { icon: <Clock size={14} />,     label: 'Робочі години',   value: user.workHours != null ? String(user.workHours) : null },
    { icon: <Briefcase size={14} />, label: 'Дата початку',    value: user.startDate ?? null },
  ]

  const handleSubmit = (values: UpdateProfileFormType) => {
    updateProfile(values, { onSuccess: () => closeDialog() })
  }

  const handleOpenEdit = () => {
    openDialog({
      title: 'Редагувати профіль',
      formId: FORM_ID,
      withForm: true,
      content: (
        <UpdateProfileForm
          formId={FORM_ID}
          defaultValues={{
            name:      user.name      ?? '',
            lastName:  user.lastName  ?? '',
            phone:     user.phone     ?? '',
            birthday:  user.birthday  ?? '',
            workHours: user.workHours,
            startDate: user.startDate ?? '',
          }}
          onSubmit={handleSubmit}
        />
      ),
    })
  }

  return (
    <div className="flex justify-center items-start p-6">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card shadow-sm overflow-hidden">

        {/* Header */}
        <div className="bg-[#002131] px-6 py-5 flex items-center justify-between">
          <UserAvatar
            name={user.name}
            image={user.image}
            role={user.role}
            size="lg"
            showName
            showRole
          />
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={handleOpenEdit}
            className="text-white/60 hover:text-white hover:bg-white/10 shrink-0"
          >
            <Pencil className="size-4" />
          </Button>
        </div>

        {/* Fields */}
        <div className="px-5 py-1">
          {fields.map((field, i) => (
            <div key={field.label}>
              {i > 0 && <Divider />}
              <FieldRow {...field} />
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}