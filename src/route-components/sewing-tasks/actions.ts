import { useMutation } from '@tanstack/react-query'
import { useConvexMutation } from '@convex-dev/react-query'
import { api } from 'convex/_generated/api'
import { toast } from 'sonner'

export const useUpdateSewingSubTaskStatus = () =>
  useMutation({
    mutationFn: useConvexMutation(api.queries.sewing.updateSewingSubTaskStatus),
    onError: (e: Error) => toast.error(e.message),
  })

export const useCompleteSewingSubTask = () =>
  useMutation({
    mutationFn: useConvexMutation(api.queries.sewing.completeSewingSubTask),
    onSuccess: () => toast.success('Завдання виконано'),
    onError: (e: Error) => toast.error(e.message),
  })
