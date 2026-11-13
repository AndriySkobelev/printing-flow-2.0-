import { useConvexMutation } from "@convex-dev/react-query"
import { useMutation } from "@tanstack/react-query"
import { api } from "convex/_generated/api"
import { toast } from "sonner"

export const useUpdateSystemSettings = () =>
  useMutation({
    mutationFn: useConvexMutation(api.queries.settings.updateSystemSettings),
    onSuccess: () => toast.success('Налаштування збережено'),
    onError: (e: Error) => toast.error(e.message),
  })

const onError = (e: Error) => toast.error(e.message)

export const useUpdateSystemRole = () =>
  useMutation({
    mutationFn: useConvexMutation(api.queries.roles.updateSystemRole),
    onSuccess: () => toast.success('Роль збережено'),
    onError,
  })

export const useResetSystemRole = () =>
  useMutation({
    mutationFn: useConvexMutation(api.queries.roles.resetSystemRole),
    onSuccess: () => toast.success('Роль повернуто до стандартної'),
    onError,
  })

export const useCreateRole = () =>
  useMutation({
    mutationFn: useConvexMutation(api.queries.roles.createRole),
    onSuccess: () => toast.success('Роль створено'),
    onError,
  })

export const useUpdateRole = () =>
  useMutation({
    mutationFn: useConvexMutation(api.queries.roles.updateRole),
    onSuccess: () => toast.success('Роль збережено'),
    onError,
  })

export const useDeleteRole = () =>
  useMutation({
    mutationFn: useConvexMutation(api.queries.roles.deleteRole),
    onSuccess: () => toast.success('Роль видалено'),
    onError,
  })
