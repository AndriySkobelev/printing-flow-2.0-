import { useMemo } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { convexQuery, useConvexMutation } from '@convex-dev/react-query'
import { dayKey, dayToMs } from './helpers'
import { api } from 'convex/_generated/api'
import { toast } from 'sonner'

export function useUpdateSewingSubTaskDates() {
  return useMutation({
    mutationFn: useConvexMutation(api.queries.sewing.updateSewingSubTaskDates),
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useUpdateSewingTaskStatus() {
  return useMutation({
    mutationFn: useConvexMutation(api.queries.sewing.updateSewingTaskStatus),
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useUpdateSewingSubTaskAssignee() {
  return useMutation({
    mutationFn: useConvexMutation(api.queries.sewing.updateSewingSubTaskAssignee),
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useSplitSewingSubTask() {
  return useMutation({
    mutationFn: useConvexMutation(api.queries.sewing.splitSewingSubTask),
    onError: (e: Error) => toast.error(e.message),
  })
}

export const useMergeSewingSubTaskIntoParent = () =>
  useMutation({
    mutationFn: useConvexMutation(api.queries.sewing.mergeSewingSubTaskIntoParent),
    onError: (e: Error) => toast.error(e.message),
  })

export const useToggleSewingSubTaskExtraWork = () =>
  useMutation({
    mutationFn: useConvexMutation(api.queries.sewing.toggleSewingSubTaskExtraWork),
    onError: (e: Error) => toast.error(e.message),
  })

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
export const useSetSewingSubTaskDay = () =>
  useMutation({
    mutationFn: useConvexMutation(api.queries.sewing.setSewingSubTaskDay),
    onError: (e: Error) => toast.error(e.message),
  })

export const useBulkAssignSewingSubTasks = () =>
  useMutation({
    mutationFn: useConvexMutation(api.queries.sewing.bulkAssignSewingSubTasks),
    onError: (e: Error) => toast.error(e.message),
  })

export const useBulkSetSewingSubTaskDay = () =>
  useMutation({
    mutationFn: useConvexMutation(api.queries.sewing.bulkSetSewingSubTaskDay),
    onError: (e: Error) => toast.error(e.message),
  })

export const useBulkSetSewingSubTaskExtraWork = () =>
  useMutation({
    mutationFn: useConvexMutation(api.queries.sewing.bulkSetSewingSubTaskExtraWork),
    onError: (e: Error) => toast.error(e.message),
  })

export type DayOff = { note?: string }

// sewerId → yyyy-MM-dd → day off, for the given days.
export const useDaysOffByDay = (days: Date[]) => {
  const keys = useMemo(() => days.map(dayKey), [days])
  const { data: periods = [] } = useQuery(convexQuery(api.queries.sewerDaysOff.getSewerDaysOff, {
    from: dayToMs(keys[0]),
    to:   dayToMs(keys[keys.length - 1]),
  }))
  return useMemo(() => {
    const map = new Map<string, Map<string, DayOff>>()
    for (const p of periods) {
      const byDay = map.get(p.userId) ?? new Map<string, DayOff>()
      for (const key of keys) {
        const ms = dayToMs(key)
        if (ms >= p.from && ms <= p.to) byDay.set(key, { note: p.note })
      }
      map.set(p.userId, byDay)
    }
    return map
  }, [periods, keys])
}
