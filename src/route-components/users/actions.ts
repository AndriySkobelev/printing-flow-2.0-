import { useMutation } from '@tanstack/react-query'
import { useConvexMutation } from '@convex-dev/react-query'
import { api } from 'convex/_generated/api'
import { toast } from 'sonner'

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
