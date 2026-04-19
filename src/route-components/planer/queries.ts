import { useQuery, useMutation } from '@tanstack/react-query'
import { convexQuery, useConvexMutation } from '@convex-dev/react-query'
import { api } from 'convex/_generated/api'
import { toast } from 'sonner'

export function usePlannerEvents(from: string, to: string) {
  return useQuery(convexQuery(api.queries.planner.getEventsByDateRange, { from, to }))
}

export function useCreateEvent() {
  return useMutation({
    mutationFn: useConvexMutation(api.queries.planner.createEvent),
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useUpdateEvent() {
  return useMutation({
    mutationFn: useConvexMutation(api.queries.planner.updateEvent),
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useDeleteEvent() {
  return useMutation({
    mutationFn: useConvexMutation(api.queries.planner.deleteEvent),
    onError: (e: Error) => toast.error(e.message),
  })
}