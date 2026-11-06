import { useContext } from 'react'
import { LogOut, Pencil } from 'lucide-react'
import { useAuthActions } from '@convex-dev/auth/react'
import { useAuth } from '@/hooks/auth-hooks'
import { Button } from '@/components/ui/button'
import { UserProfile } from '@/components/user-profile'
import { DialogContext } from '@/contexts/dialog'
import UpdateProfileForm, { type UpdateProfileFormType } from './forms/update-profile-form'
import { useUpdateProfile } from './actions'

const FORM_ID = 'update-profile-form'

const Profile = () => {
  const { user } = useAuth()
  const { signOut } = useAuthActions()
  const { openDialog, closeDialog } = useContext(DialogContext)
  const { mutate: updateProfile } = useUpdateProfile()

  if (!user) return null

  const handleOpenEdit = () => {
    const id = openDialog({
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
          onSubmit={(values: UpdateProfileFormType) =>
            updateProfile(values, { onSuccess: () => closeDialog(id) })
          }
        />
      ),
    })
  }

  return (
    <UserProfile
      user={user}
      actions={
        <>
          <Button className="flex-1" size="sm" onClick={handleOpenEdit}>
            <Pencil size={14} /> Редагувати
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => signOut()}
          >
            <LogOut size={14} /> Вийти
          </Button>
        </>
      }
    />
  )
}

export default Profile
