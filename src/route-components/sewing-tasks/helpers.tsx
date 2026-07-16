import { type ReactNode } from 'react'
import { Play, Pause } from 'lucide-react'
import { type SubTask } from './types'

export const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  new:         { label: 'Нове',      className: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'В роботі', className: 'bg-amber-100 text-amber-700' },
  done:        { label: 'Готово',    className: 'bg-green-100 text-green-700' },
  paused:      { label: 'Пауза',     className: 'bg-gray-100 text-gray-500' },
}

const startAction = { label: 'В роботі', icon: <Play size={11} />, next: 'in_progress' as const }

// Before a task is started, the only move is new → in_progress. Once it's
// running, this same action toggles between the remaining statuses
// (in_progress ↔ paused); "done" is handled by its own button.
export const toggleAction: Record<SubTask['status'], { label: string; icon: ReactNode; next: 'in_progress' | 'paused' }> = {
  new:         startAction,
  paused:      startAction,
  in_progress: { label: 'Пауза', icon: <Pause size={11} />, next: 'paused' as const },
  done:        startAction, // never rendered — the button is hidden once a task is done
}

export const formatDate = (ts: number) =>
  new Date(ts).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: '2-digit' })
