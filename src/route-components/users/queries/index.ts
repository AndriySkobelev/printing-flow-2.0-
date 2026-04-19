import { useQuery, useMutation } from '@tanstack/react-query'
import { convexQuery, useConvexMutation } from '@convex-dev/react-query'
import { api } from 'convex/_generated/api'
import { toast } from 'sonner'

export const useGetAllUsers = () =>
  useQuery(convexQuery(api.queries.users.getAllUsers, {}))

export const useUpdateUser = () =>
  useMutation({
    mutationFn: useConvexMutation(api.queries.users.updateUser),
    onSuccess: () => toast.success('Користувача оновлено.', { duration: 3000, position: 'top-center' }),
    onError: (e: Error) => toast.error(`Помилка: ${e.message}`, { duration: 3000, position: 'top-center' }),
  })

export const useDeleteUser = () =>
  useMutation({
    mutationFn: useConvexMutation(api.queries.users.deleteUser),
    onSuccess: () => toast.success('Користувача видалено.', { duration: 3000, position: 'top-center' }),
    onError: (e: Error) => toast.error(`Помилка: ${e.message}`, { duration: 3000, position: 'top-center' }),
  })

export const useUpdateSeamstressData = () =>
  useMutation({
    mutationFn: useConvexMutation(api.queries.users.updateSeamstressData),
    onSuccess: () => toast.success('Дані оновлено.', { duration: 3000, position: 'top-center' }),
    onError: (e: Error) => toast.error(`Помилка: ${e.message}`, { duration: 3000, position: 'top-center' }),
  })