import { useMutation } from '@tanstack/react-query'
import { useConvexMutation } from '@convex-dev/react-query'
import { api } from 'convex/_generated/api'
import { toast } from 'sonner'

export const useUpdateCuttingTaskPlanedEndDate = () =>
  useMutation({
    mutationFn: useConvexMutation(api.queries.cutting.updateCuttingTaskPlanedEndDate),
    onError: (e: Error) => toast.error(e.message),
  })

export const useUpdateCuttingTaskStatus = () =>
  useMutation({
    mutationFn: useConvexMutation(api.queries.cutting.updateCuttingTaskStatus),
    onError: (e: Error) => toast.error(e.message),
  })
