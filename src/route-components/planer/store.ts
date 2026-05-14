import { create } from 'zustand'
import { DAY_MINS } from './constants'

// Shift a yyyy-mm-dd string by n calendar days
const dateShift = (dateStr: string, n: number): string => {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d + n)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

export type PlannedTask = {
  sewingSubTaskId: string
  sewerId:         string
  isScheduled:     boolean
  startDate:       string   // yyyy-mm-dd, meaningful only when isScheduled=true
  startMinute:     number   // minutes from DAY_START
  durationMinutes: number
  quantity:        number
  orderNumber:     string
  specName:        string
  color:           string
  size:            string | undefined
  isDirty:         boolean
}

type PlannerStore = {
  tasks:         Record<string, PlannedTask>
  assign:        (task: Omit<PlannedTask, 'isDirty'>) => void
  schedule:      (id: string, startDate: string, startMinute: number) => void
  move:          (id: string, startDate: string, startMinute: number) => void
  moveWithPush:  (id: string, startDate: string, startMinute: number) => void
  moveWithSwap:  (id: string, startDate: string, startMinute: number, sewerPeers: PlannedTask[]) => void
  resize:        (id: string, durationMinutes: number) => void
  unassign:      (id: string) => void
  markSaved:     (id: string) => void
}

export const usePlannerStore = create<PlannerStore>((set) => ({
  tasks: {},

  assign: (task) =>
    set((s) => ({
      tasks: { ...s.tasks, [task.sewingSubTaskId]: { ...task, isDirty: false } },
    })),

  schedule: (id, startDate, startMinute) =>
    set((s) =>
      s.tasks[id]
        ? { tasks: { ...s.tasks, [id]: { ...s.tasks[id], startDate, startMinute, isScheduled: true, isDirty: true } } }
        : s
    ),

  move: (id, startDate, startMinute) =>
    set((s) =>
      s.tasks[id]
        ? { tasks: { ...s.tasks, [id]: { ...s.tasks[id], startDate, startMinute, isDirty: true } } }
        : s
    ),

  moveWithPush: (id, startDate, startMinute) =>
    set((s) => {
      const task = s.tasks[id]
      if (!task) return s

      const draft: Record<string, PlannedTask> = {
        ...s.tasks,
        [id]: { ...task, startDate, startMinute, isDirty: true },
      }

      // All other scheduled peers on the same sewer, sorted chronologically across all dates
      const peers = Object.values(s.tasks)
        .filter((t) => t.isScheduled && t.sewingSubTaskId !== id && t.sewerId === task.sewerId)
        .sort((a, b) => a.startDate < b.startDate ? -1 : a.startDate > b.startDate ? 1 : a.startMinute - b.startMinute)

      // ── Forward push (right, with cross-day overflow) ──────────────────────
      let fwdDate   = startDate
      let fwdCursor = startMinute + task.durationMinutes
      if (fwdCursor >= DAY_MINS) {
        fwdDate   = dateShift(fwdDate, Math.floor(fwdCursor / DAY_MINS))
        fwdCursor = fwdCursor % DAY_MINS
      }

      for (const peer of peers) {
        // skip peers before the dragged task's new position
        if (peer.startDate < startDate || (peer.startDate === startDate && peer.startMinute < startMinute)) continue
        // stop when the peer is already clear of the cursor
        if (peer.startDate > fwdDate || (peer.startDate === fwdDate && peer.startMinute >= fwdCursor)) break

        draft[peer.sewingSubTaskId] = { ...peer, startDate: fwdDate, startMinute: fwdCursor, isDirty: true }
        fwdCursor += peer.durationMinutes
        if (fwdCursor >= DAY_MINS) {
          fwdDate   = dateShift(fwdDate, Math.floor(fwdCursor / DAY_MINS))
          fwdCursor = fwdCursor % DAY_MINS
        }
      }

      return { tasks: draft }
    }),

  moveWithSwap: (id: string, startDate: string, startMinute: number, sewerPeers: PlannedTask[]) =>
    set((s) => {
      const task = s.tasks[id]
      if (!task) return s

      const draft: Record<string, PlannedTask> = { ...s.tasks }

      // Reset all sewer peers to drag-start positions so each event computes from a clean baseline
      for (const peer of sewerPeers) {
        if (draft[peer.sewingSubTaskId]) {
          draft[peer.sewingSubTaskId] = { ...draft[peer.sewingSubTaskId], startDate: peer.startDate, startMinute: peer.startMinute }
        }
      }

      // Find the single touched task: rightmost peer (original positions) overlapping current drag position
      const touched = sewerPeers
        .filter((t: PlannedTask) => t.startDate === startDate && startMinute < t.startMinute + t.durationMinutes / 1.25 && t.startMinute < startMinute + task.durationMinutes)
        .sort((a: PlannedTask, b: PlannedTask) => (b.startMinute + b.durationMinutes) - (a.startMinute + a.durationMinutes))[0]

      if (touched) {
        // Dragged task snaps to the touched task's original start
        draft[id] = { ...task, startDate: touched.startDate, startMinute: touched.startMinute, isDirty: true }
        // Touched task goes right after the dragged task ends
        let newMin  = touched.startMinute + task.durationMinutes
        let newDate = touched.startDate
        if (newMin >= DAY_MINS) {
          newDate = dateShift(newDate, Math.floor(newMin / DAY_MINS))
          newMin  = newMin % DAY_MINS
        }
        draft[touched.sewingSubTaskId] = { ...draft[touched.sewingSubTaskId], startDate: newDate, startMinute: newMin, isDirty: true }
      } else {
        // No touch — move freely to cursor position
        draft[id] = { ...task, startDate, startMinute, isDirty: true }
      }

      return { tasks: draft }
    }),

  resize: (id, durationMinutes) =>
    set((s) =>
      s.tasks[id]
        ? { tasks: { ...s.tasks, [id]: { ...s.tasks[id], durationMinutes, isDirty: true } } }
        : s
    ),

  unassign: (id) =>
    set((s) => {
      const { [id]: _, ...rest } = s.tasks
      return { tasks: rest }
    }),

  markSaved: (id) =>
    set((s) =>
      s.tasks[id]
        ? { tasks: { ...s.tasks, [id]: { ...s.tasks[id], isDirty: false } } }
        : s
    ),
}))
