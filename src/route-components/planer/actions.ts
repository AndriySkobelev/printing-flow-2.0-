import { useMutation } from '@tanstack/react-query'
import { useConvexMutation } from '@convex-dev/react-query'
import { api } from 'convex/_generated/api'
import { toast } from 'sonner'

export const useCreateSewerDayOff = () =>
  useMutation({
    mutationFn: useConvexMutation(api.queries.sewerDaysOff.createSewerDayOff),
    onError: (e: Error) => toast.error(e.message),
  })

export const useDeleteSewerDayOff = () =>
  useMutation({
    mutationFn: useConvexMutation(api.queries.sewerDaysOff.deleteSewerDayOff),
    onError: (e: Error) => toast.error(e.message),
  })

export const useSetCuttingTasksPlanedEndDate = () =>
  useMutation({
    mutationFn: useConvexMutation(api.queries.cutting.setCuttingTasksPlanedEndDate),
    onError: (e: Error) => toast.error(e.message),
  })
