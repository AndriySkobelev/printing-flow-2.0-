import { type ReactNode } from 'react'
import { Play, CheckCheck } from 'lucide-react'
import { type SubTask } from './types'

export const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  new:         { label: 'Нове',      className: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'В роботі', className: 'bg-amber-100 text-amber-700' },
  done:        { label: 'Готово',    className: 'bg-green-100 text-green-700' },
  paused:      { label: 'Пауза',     className: 'bg-gray-100 text-gray-500' },
}

// The single main button walks a task forward: start (or resume) → done.
// Pausing is a separate button shown only while the task is running.
export const mainAction: Record<SubTask['status'], { label: string; icon: ReactNode; next: 'in_progress' | 'done' }> = {
  new:         { label: 'В роботу',   icon: <Play size={11} />,       next: 'in_progress' },
  paused:      { label: 'Продовжити', icon: <Play size={11} />,       next: 'in_progress' },
  in_progress: { label: 'Виконати',   icon: <CheckCheck size={11} />, next: 'done' },
  done:        { label: 'Виконати',   icon: <CheckCheck size={11} />, next: 'done' }, // never rendered — no actions once done
}

export const formatDate = (ts: number) =>
  new Date(ts).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: '2-digit' })
