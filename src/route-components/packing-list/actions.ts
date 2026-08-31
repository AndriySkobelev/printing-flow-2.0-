import { useMutation } from '@tanstack/react-query'
import { useConvexMutation } from '@convex-dev/react-query'
import { api } from 'convex/_generated/api'
import { toast } from 'sonner'

export const useCreatePackagingLog = (onSuccess?: () => void) =>
  useMutation({
    mutationFn: useConvexMutation(api.queries.packaging.createPackagingLog),
    onSuccess: () => {
      toast.success('Збережено')
      onSuccess?.()
    },
    onError: (e: Error) => toast.error(e.message),
  })

export const useUpdatePackagingTaskStatus = () =>
  useMutation({
    mutationFn: useConvexMutation(api.queries.packaging.updatePackagingTaskStatus),
    onError: (e: Error) => toast.error(e.message),
  })
