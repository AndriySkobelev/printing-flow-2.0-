import { useContext } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useConvexMutation } from '@convex-dev/react-query'
import { api } from 'convex/_generated/api'
import { type Id } from 'convex/_generated/dataModel'
import { toast } from 'sonner'
import { DialogContext } from '@/contexts/dialog'

const onError = (e: Error) => toast.error(`Помилка: ${e.message}`, { duration: 3000, position: 'top-center' })
const success = (msg: string) => () => toast.success(msg, { duration: 3000, position: 'top-center' })

export const useUpdateUser = () =>
  useMutation({
    mutationFn: useConvexMutation(api.queries.users.updateUser),
    onSuccess: success('Користувача оновлено.'),
    onError,
  })

export const useApproveUser = () =>
  useMutation({
    mutationFn: useConvexMutation(api.queries.users.approveUser),
    onSuccess: success('Користувача підтверджено.'),
    onError,
  })

export const useDeleteUser = () =>
  useMutation({
    mutationFn: useConvexMutation(api.queries.users.deleteUser),
    onSuccess: success('Користувача видалено.'),
    onError,
  })

export const useUpdateSeamstressData = () =>
  useMutation({
    mutationFn: useConvexMutation(api.queries.users.updateSeamstressData),
    onSuccess: success('Дані оновлено.'),
    onError,
  })

export const useUpdateUserPages = () =>
  useMutation({
    mutationFn: useConvexMutation(api.queries.users.updateUserPages),
    onError,
  })

// Asks first; `onDeleted` runs after the user is gone.
export const useConfirmDeleteUser = () => {
  const { openDialog, closeDialog, setIsLoading } = useContext(DialogContext)
  const { mutate: deleteUser } = useDeleteUser()
  return (user: { _id: Id<'users'>; name?: string; lastName?: string; email?: string }, onDeleted?: () => void) => {
    const fullName = [user.name, user.lastName].filter(Boolean).join(' ') || user.email || 'користувача'
    const id = openDialog({
      title:        `Видалити ${fullName}?`,
      description:  'Користувач втратить доступ, а його дані входу буде видалено. Цю дію не можна скасувати.',
      content:      null,
      withForm:     true,
      actionSubmit: () => {
        setIsLoading(true)
        deleteUser({ id: user._id }, {
          onSuccess: () => { closeDialog(id); onDeleted?.() },
          onSettled: () => setIsLoading(false),
        })
      },
    })
  }
}
