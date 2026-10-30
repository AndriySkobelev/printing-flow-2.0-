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

export const useCreateExtraWork = () =>
  useMutation({
    mutationFn: useConvexMutation(api.queries.extraWorks.createExtraWork),
    onSuccess: () => toast.success('Роботу додано'),
    onError: (e: Error) => toast.error(e.message),
  })

export const useUpdateExtraWork = () =>
  useMutation({
    mutationFn: useConvexMutation(api.queries.extraWorks.updateExtraWork),
    onSuccess: () => toast.success('Роботу збережено'),
    onError: (e: Error) => toast.error(e.message),
  })

export const useDeleteExtraWork = () =>
  useMutation({
    mutationFn: useConvexMutation(api.queries.extraWorks.deleteExtraWork),
    onSuccess: () => toast.success('Роботу видалено'),
    onError: (e: Error) => toast.error(e.message),
  })
