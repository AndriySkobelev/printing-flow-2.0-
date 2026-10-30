import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from 'convex/_generated/api'
import { type Id } from 'convex/_generated/dataModel'
import { UTCDate } from '@date-fns/utc'
import { addDays, startOfWeek, format } from 'date-fns'
import { ChevronLeft, ChevronRight, UserPlus, CalendarDays, UserMinus, Undo2, Sparkles, Plus, Minus, SplitSquareHorizontal, Wrench } from 'lucide-react'
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { Button } from '@/components/ui/button'
import { ActionsMenu } from '@/components/actions-menu'
import { cn } from '@/lib/utils'
import { SEWER_COLORS, DAY_NAMES } from '../constants'
import { fmtDur, taskDurationMinutes, SEWER_DAY_CAPACITY as DAY_CAPACITY } from '../helpers'
import { useUpdateSewingSubTaskAssignee, useSetSewingSubTaskDay, useSplitSewingSubTask } from '../queries'

// ─── Types ───────────────────────────────────────────────────────────────────

type Sewer = { id: string; name: string; color: string }

type KanbanTask = {
  id:              string
  orderNumber:     string
  specName:        string
  color:           string   // fabric color, used as card accent
  colorName?:      string
  labelColor?:     string   // text color readable on `color`
  size?:           string
  quantity:        number
  durationMinutes: number
  extraWorks:      { name: string; minutesPerUnit: number }[]
  status:          'new' | 'in_progress' | 'done' | 'paused'
  isCustom?:       boolean
  sewerId:         string | null
  day:             string | null   // yyyy-MM-dd
}

// A drop target: a day column of the active sewer, or a day's "no sewer" zone.
type Zone = { day: string; kind: 'sewer' | 'pool' }

// ─── Date helpers ────────────────────────────────────────────────────────────

const dayKey = (d: Date) => format(d, 'yyyy-MM-dd')

const weekDays = (anchor: Date) => {
  const monday = startOfWeek(anchor, { weekStartsOn: 1 })
  return Array.from({ length: 5 }, (_, i) => addDays(monday, i))
}

// yyyy-MM-dd ⇄ UTC-midnight ms, as stored in sub-task startDate.
const dayToMs = (key: string) => {
  const [y, m, d] = key.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}
const msToDay = (ms: number) => dayKey(new UTCDate(ms))

const STATUS_DOT: Record<KanbanTask['status'], string> = {
  new:         'bg-blue-400',
  in_progress: 'bg-amber-400',
  done:        'bg-green-500',
  paused:      'bg-gray-400',
}

const STATUS_LABEL: Record<KanbanTask['status'], string> = {
  new:         'Новий',
  in_progress: 'В роботі',
  done:        'Готово',
  paused:      'Пауза',
}

// ─── TaskCard ────────────────────────────────────────────────────────────────

type CardActions = {
  sewers:     Sewer[]
  days:       Date[]
  onAssign:   (taskId: string, sewerId: string | null) => void
  onSetDay:   (taskId: string, day: string | null) => void
  onSplit:    (taskId: string, qty: number) => void
}

const toggleItemIcon = (isOn: boolean) => (
  <>
    <Plus  className={cn('size-2.5 text-foreground', isOn && 'hidden')} />
    <Minus className={cn('size-2.5 text-foreground', !isOn && 'hidden')} />
  </>
)

const toggleItemClass = (isOn: boolean) =>
  cn('my-0.5', isOn && 'bg-violet-50 text-violet-700 focus:bg-violet-100 focus:text-violet-800')

const TaskCardBody = ({ task, sewer, actions, onStartSplit }: {
  task:          KanbanTask
  sewer?:        Sewer
  actions?:      CardActions
  onStartSplit?: () => void
}) => (
  <div
    className={cn(
      'relative flex flex-col gap-1 rounded-md border bg-background pl-3 pr-1.5 py-1.5 text-[12px] shadow-xs',
      task.isCustom ? 'border-violet-300 bg-violet-50/50' : 'border-border',
    )}
  >
    <span className="absolute inset-y-0 left-0 w-[3px] rounded-l-md" style={{ background: task.color }} />
    <div className="flex items-center gap-1.5">
      {sewer && (
        <span
          className="size-4 rounded-full flex items-center justify-center text-white text-[8px] font-bold shrink-0"
          style={{ background: sewer.color }}
          title={sewer.name}
        >
          {sewer.name[0]}
        </span>
      )}
      <span className="font-semibold">#{task.orderNumber}</span>
      {task.isCustom && <Sparkles size={11} className="text-violet-600" />}
      {task.size && (
        <span className="text-[10px] font-semibold px-1 py-0.5 rounded bg-muted border border-border/60 leading-none">
          {task.size}
        </span>
      )}
      {task.extraWorks.length > 0 && (
        <span
          className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-violet-100 text-violet-700 text-[10px] font-semibold leading-none"
          title={`Додаткова робота: ${task.extraWorks.map(w => w.name).join(', ')}`}
        >
          <Wrench size={10} />
          {task.extraWorks.length}
        </span>
      )}
      <div className="ml-auto" onPointerDown={e => e.stopPropagation()}>
        {actions && (
          <ActionsMenu
            items={[
              {
                label:    'Швачка',
                icon:     <UserPlus size={12} />,
                subItems: actions.sewers.map(s => {
                  const isCurrent = task.sewerId === s.id
                  return {
                    label:     s.name,
                    icon:      toggleItemIcon(isCurrent),
                    className: toggleItemClass(isCurrent),
                    onClick:   () => actions.onAssign(task.id, isCurrent ? null : s.id),
                  }
                }),
              },
              {
                label:    'День',
                icon:     <CalendarDays size={12} />,
                subItems: actions.days.map((d, i) => {
                  const key = dayKey(d)
                  const isCurrent = task.day === key
                  return {
                    label:     `${DAY_NAMES[i]} ${format(d, 'dd.MM')}`,
                    icon:      toggleItemIcon(isCurrent),
                    className: toggleItemClass(isCurrent),
                    onClick:   () => actions.onSetDay(task.id, isCurrent ? null : key),
                  }
                }),
              },
              {
                label:    'Розділити',
                icon:     <SplitSquareHorizontal size={12} />,
                disabled: task.quantity <= 1,
                onClick:  onStartSplit,
              },
              ...(task.sewerId ? [{
                label:       'Зняти швачку',
                icon:        <UserMinus size={12} />,
                destructive: true,
                onClick:     () => actions.onAssign(task.id, null),
              }] : []),
              ...(task.day ? [{
                label:       'Зняти з дня',
                icon:        <Undo2 size={12} />,
                destructive: true,
                onClick:     () => actions.onSetDay(task.id, null),
              }] : []),
            ]}
          />
        )}
      </div>
    </div>
    <div className="flex items-center gap-1.5 min-w-0">
      {task.colorName && (
        <span
          className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none"
          style={{ backgroundColor: task.color, color: task.labelColor ?? '#ffffff' }}
        >
          {task.colorName}
        </span>
      )}
      <span className="text-muted-foreground truncate">{task.specName}</span>
    </div>
    <div className="flex items-center gap-2 text-[11px]">
      <span className={cn('size-1.5 rounded-full', STATUS_DOT[task.status])} />
      <span className="text-muted-foreground">{STATUS_LABEL[task.status]}</span>
      <span className="ml-auto tabular-nums">{task.quantity} шт</span>
      <span className="tabular-nums font-medium">{fmtDur(task.durationMinutes)}</span>
    </div>
  </div>
)

// Draggable, and a drop target itself — dropping on a card drops into its zone.
const TaskCard = ({ task, zone, sewer, actions }: { task: KanbanTask; zone: Zone | null; sewer?: Sewer; actions: CardActions }) => {
  const [isSplitting, setSplitting] = useState(false)
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({ id: task.id, disabled: isSplitting })
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id:       `card:${task.id}`,
    data:     { zone },
    disabled: !zone,
  })

  return (
    <div ref={setDropRef} className={cn('flex flex-col gap-1 rounded-md', isOver && !isDragging && 'ring-2 ring-primary/40')}>
      <div
        ref={setDragRef}
        {...listeners}
        {...attributes}
        className={cn('cursor-grab active:cursor-grabbing select-none', isDragging && 'opacity-30')}
      >
        <TaskCardBody task={task} sewer={sewer} actions={actions} onStartSplit={() => setSplitting(true)} />
      </div>
      {isSplitting && (
        <SplitInline
          task={task}
          onCancel={() => setSplitting(false)}
          onConfirm={(qty) => { actions.onSplit(task.id, qty); setSplitting(false) }}
        />
      )}
    </div>
  )
}

// ─── SplitInline ─────────────────────────────────────────────────────────────

// How many pieces to split off, with the time each part takes; for a planned
// task the part goes to "not distributed".
const SplitInline = ({ task, onConfirm, onCancel }: { task: KanbanTask; onConfirm: (qty: number) => void; onCancel: () => void }) => {
  const [value, setValue] = useState('')
  const qty     = parseInt(value, 10)
  const isValid = qty > 0 && qty < task.quantity

  return (
    <div className="flex flex-col gap-1 rounded-md border bg-background px-2 py-1.5">
      <div className="flex items-center gap-1">
        <input
          type="number"
          min={1}
          max={task.quantity - 1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && isValid) onConfirm(qty)
            if (e.key === 'Escape') onCancel()
          }}
          placeholder="К-сть"
          className="w-16 h-6 rounded border border-border bg-background px-1.5 text-[11px] outline-none"
          autoFocus
        />
        <Button type="button" size="sm" className="h-6 px-2 text-[11px]" disabled={!isValid} onClick={() => onConfirm(qty)}>
          ОК
        </Button>
        <Button type="button" variant="outline" size="sm" className="h-6 px-2 text-[11px]" onClick={onCancel}>
          ✕
        </Button>
      </div>
      {isValid && (
        <div className="flex flex-col text-[11px] tabular-nums">
          <span>{`Відділяємо: ${qty} шт · ${fmtDur(taskDurationMinutes(qty, task.extraWorks))}`}</span>
          <span className="text-muted-foreground">{`Залишиться: ${task.quantity - qty} шт · ${fmtDur(taskDurationMinutes(task.quantity - qty, task.extraWorks))}`}</span>
        </div>
      )}
    </div>
  )
}

// ─── DayColumn ───────────────────────────────────────────────────────────────

const LoadBar = ({ used }: { used: number }) => {
  const pct = Math.round((used / DAY_CAPACITY) * 100)
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-[11px] tabular-nums">
        <span className={cn('font-semibold', pct > 100 ? 'text-red-500' : pct > 80 ? 'text-amber-500' : 'text-emerald-600')}>
          {used} / {DAY_CAPACITY} хв
        </span>
        <span className="text-muted-foreground">{used > DAY_CAPACITY ? `+${fmtDur(used - DAY_CAPACITY)}` : `вільно ${fmtDur(DAY_CAPACITY - used)}`}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full', pct > 100 ? 'bg-red-500' : pct > 80 ? 'bg-amber-400' : 'bg-emerald-500')}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  )
}

const DropZone = ({ zone, className, children }: { zone: Zone; className?: string; children: React.ReactNode }) => {
  const { setNodeRef, isOver } = useDroppable({ id: `${zone.kind}:${zone.day}`, data: { zone } })
  return (
    <div ref={setNodeRef} className={cn(className, isOver && 'ring-2 ring-inset ring-primary/40 bg-primary/5')}>
      {children}
    </div>
  )
}

const DayColumn = ({ date, index, isToday, sewer, sewerTasks, poolTasks, sewers, actions }: {
  date:       Date
  index:      number
  isToday:    boolean
  sewer:      Sewer
  sewerTasks: KanbanTask[]
  poolTasks:  KanbanTask[]
  sewers:     Sewer[]
  actions:    CardActions
}) => {
  const day  = dayKey(date)
  const used = sewerTasks.reduce((sum, t) => sum + t.durationMinutes, 0)

  return (
    <div className={cn('flex flex-col min-w-56 flex-1 min-h-0 rounded-lg border bg-muted/20', isToday && 'border-primary/50 bg-primary/5')}>
      {/* Header stays put; only the tasks below scroll. */}
      <div className="shrink-0 flex flex-col gap-2 px-2.5 pt-2 pb-2 border-b">
        <div className="flex items-baseline gap-2">
          <span className={cn('text-sm font-semibold', isToday && 'text-primary')}>{DAY_NAMES[index]}</span>
          <span className="text-xs text-muted-foreground">{format(date, 'dd.MM')}</span>
        </div>
        <LoadBar used={used} />
      </div>

      <div className="flex-1 min-h-0 flex flex-col overflow-y-auto">
        {/* Tasks planned for the day but not given to anyone yet — shared by all sewer tabs. */}
        <DropZone
          zone={{ day, kind: 'pool' }}
          className="flex flex-col gap-1.5 m-1.5 p-1.5 rounded-md border border-dashed border-amber-400/70 bg-amber-50/60 min-h-10"
        >
          <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">
            Не призначено{poolTasks.length > 0 && ` · ${fmtDur(poolTasks.reduce((s, t) => s + t.durationMinutes, 0))}`}
          </span>
          {poolTasks.map(task => (
            <TaskCard key={task.id} task={task} zone={{ day, kind: 'pool' }} actions={actions} />
          ))}
        </DropZone>

        <DropZone zone={{ day, kind: 'sewer' }} className="flex flex-col gap-1.5 flex-1 p-1.5 rounded-b-lg min-h-40">
          {sewerTasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              zone={{ day, kind: 'sewer' }}
              sewer={sewers.find(s => s.id === task.sewerId)}
              actions={actions}
            />
          ))}
          {sewerTasks.length === 0 && (
            <span className="m-auto text-[11px] text-muted-foreground">{`Немає задач для ${sewer.name.split(' ')[0]}`}</span>
          )}
        </DropZone>
      </div>
    </div>
  )
}

// ─── TaskStrip ───────────────────────────────────────────────────────────────

// A titled, horizontally scrolling row of cards above the day columns.
const TaskStrip = ({ title, className, children }: { title: string; className?: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1.5 min-w-0">
    <span className={cn('text-[10px] font-semibold uppercase tracking-wide', className)}>{title}</span>
    <div className="flex gap-2 overflow-x-auto pb-1">{children}</div>
  </div>
)

// ─── Main ────────────────────────────────────────────────────────────────────

const byOrder = (a: KanbanTask, b: KanbanTask) =>
  a.orderNumber.localeCompare(b.orderNumber, 'uk', { numeric: true }) || (a.size ?? '').localeCompare(b.size ?? '', 'uk', { numeric: true })

export const SewingKanban = () => {
  const [anchor, setAnchor]       = useState(() => new UTCDate())
  const [activeSewerId, setSewer] = useState<string | null>(null)
  const [draggingId, setDragging] = useState<string | null>(null)
  // Placement shown right away while the mutation round-trips.
  const [pending, setPending]     = useState<Record<string, Pick<KanbanTask, 'day' | 'sewerId'>>>({})

  const { data: sewerData = [] } = useQuery(convexQuery(api.queries.sewing.getSewerUsers, {}))
  const { data: subTasks  = [] } = useQuery(convexQuery(api.queries.sewing.getPlannerSubTasks, {}))
  const { mutate: updateAssignee } = useUpdateSewingSubTaskAssignee()
  const { mutate: setDay }         = useSetSewingSubTaskDay()
  const { mutate: splitSubTask }   = useSplitSewingSubTask()

  const sewers = useMemo<Sewer[]>(
    () => sewerData.map((u, i) => ({
      id:    u._id,
      name:  `${u.name} ${u.lastName}`.trim() || '—',
      color: SEWER_COLORS[i % SEWER_COLORS.length],
    })),
    [sewerData],
  )

  const tasks = useMemo<KanbanTask[]>(
    () => subTasks
      .map((st) => {
        const id   = String(st.sewingSubTaskId)
        const over = pending[id]
        return {
          id,
          orderNumber:     String(st.orderNumber),
          specName:        st.specName,
          color:           st.color,
          colorName:       st.colorName ?? undefined,
          labelColor:      st.labelColorHex ?? undefined,
          size:            st.size ?? undefined,
          quantity:        st.quantity,
          durationMinutes: taskDurationMinutes(st.quantity, st.extraWorks),
          extraWorks:      st.extraWorks,
          status:          st.status,
          isCustom:        st.isCustom,
          sewerId:         over ? over.sewerId : st.sewerId ? String(st.sewerId) : null,
          day:             over ? over.day : st.startDateMs != null ? msToDay(st.startDateMs) : null,
        }
      })
      .sort(byOrder),
    [subTasks, pending],
  )

  const days    = useMemo(() => weekDays(anchor), [anchor])
  const today   = dayKey(new UTCDate())
  const sewer   = sewers.find(s => s.id === activeSewerId) ?? sewers[0]
  // No sewer and no day — shared by every tab.
  const backlog = tasks.filter(t => !t.day && !t.sewerId)
  // Given to the active sewer but not put on a day yet — only on her tab.
  const noDay   = sewer ? tasks.filter(t => !t.day && t.sewerId === sewer.id) : []

  const weekKeys = useMemo(() => new Set(days.map(dayKey)), [days])
  const weekLoad = (id: string) =>
    tasks.filter(t => t.sewerId === id && t.day && weekKeys.has(t.day)).reduce((s, t) => s + t.durationMinutes, 0)

  // Whole team for the shown week; work on a day without a sewer is shown apart.
  const teamUsed     = sewers.reduce((sum, s) => sum + weekLoad(s.id), 0)
  const teamCapacity = sewers.length * DAY_CAPACITY * 5
  const teamPct      = teamCapacity ? Math.round((teamUsed / teamCapacity) * 100) : 0
  const poolWeek     = tasks.filter(t => !t.sewerId && t.day && weekKeys.has(t.day)).reduce((s, t) => s + t.durationMinutes, 0)

  const withPending = (id: string, next: Pick<KanbanTask, 'day' | 'sewerId'> | null) =>
    setPending(prev => {
      const { [id]: _, ...rest } = prev
      return next ? { ...rest, [id]: next } : rest
    })

  // The server picks the sewer's nearest day with room; the card moves when the query updates.
  const handleAssign = (taskId: string, nextSewerId: string | null) =>
    updateAssignee({
      sewingSubTaskId: taskId as Id<'sewingSubTasks'>,
      assignedTo:      (nextSewerId ?? undefined) as Id<'users'> | undefined,
    })

  const place = (taskId: string, day: string | null, sewerId?: string | null) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    withPending(taskId, { day, sewerId: sewerId === undefined ? task.sewerId : sewerId })
    setDay(
      {
        sewingSubTaskId: taskId as Id<'sewingSubTasks'>,
        day:             day ? dayToMs(day) : null,
        ...(sewerId !== undefined && { assignedTo: sewerId as Id<'users'> | null }),
      },
      { onSettled: () => withPending(taskId, null) },
    )
  }

  const handleSetDay = (taskId: string, day: string | null) => place(taskId, day)

  const handleSplit = (taskId: string, qty: number) =>
    splitSubTask({ sewingSubTaskId: taskId as Id<'sewingSubTasks'>, splitQty: qty })

  const actions: CardActions = { sewers, days, onAssign: handleAssign, onSetDay: handleSetDay, onSplit: handleSplit }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  const handleDragStart = ({ active }: DragStartEvent) => setDragging(String(active.id))

  // Drops the task on the day — into the active sewer's column, or the day's "no sewer" zone.
  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setDragging(null)
    const zone = over?.data.current?.zone as Zone | undefined
    const task = tasks.find(t => t.id === active.id)
    if (!zone || !task || !sewer) return
    const sewerId = zone.kind === 'sewer' ? sewer.id : null
    if (task.day === zone.day && task.sewerId === sewerId) return
    place(task.id, zone.day, sewerId)
  }

  const draggingTask = tasks.find(t => t.id === draggingId)

  if (!sewer) {
    return <p className="m-auto p-6 text-sm text-muted-foreground">Немає швачок</p>
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => setDragging(null)}>
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 px-3 py-2 border-b shrink-0">
          <Button variant="ghost" size="icon-sm" onClick={() => setAnchor(d => addDays(d, -7))}><ChevronLeft size={16} /></Button>
          <span className="text-sm font-medium min-w-[180px] text-center">
            {`${format(days[0], 'dd.MM')} – ${format(days[4], 'dd.MM.yyyy')}`}
          </span>
          <Button variant="ghost" size="icon-sm" onClick={() => setAnchor(d => addDays(d, 7))}><ChevronRight size={16} /></Button>
          <Button variant="outline" size="sm" onClick={() => setAnchor(new UTCDate())} className="ml-1">
            Сьогодні
          </Button>

          <div className="ml-auto flex items-center gap-2 text-xs" title={`${fmtDur(teamUsed)} з ${fmtDur(teamCapacity)}`}>
            <span className="text-muted-foreground">Тиждень</span>
            <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={cn('h-full rounded-full', teamPct > 100 ? 'bg-red-500' : teamPct > 80 ? 'bg-amber-400' : 'bg-emerald-500')}
                style={{ width: `${Math.min(100, teamPct)}%` }}
              />
            </div>
            <span className={cn('font-semibold tabular-nums', teamPct > 100 ? 'text-red-500' : teamPct > 80 ? 'text-amber-500' : 'text-emerald-600')}>
              {teamPct}%
            </span>
            {poolWeek > 0 && (
              <span className="text-amber-700 tabular-nums">{`+${fmtDur(poolWeek)} не призначено`}</span>
            )}
          </div>

          <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
            {sewers.map(s => (
              <Button
                key={s.id}
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setSewer(s.id)}
                className={cn('h-8 gap-2 px-2.5', s.id === sewer.id && 'bg-background shadow-xs hover:bg-background')}
              >
                <span
                  className="size-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                  style={{ background: s.color }}
                >
                  {s.name[0]}
                </span>
                <span className="text-xs font-medium">{s.name}</span>
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {Math.round((weekLoad(s.id) / (DAY_CAPACITY * 5)) * 100)}%
                </span>
              </Button>
            ))}
          </div>
        </div>

        {(backlog.length > 0 || noDay.length > 0) && (
          <div className="flex gap-3 px-3 py-2 border-b bg-muted/20">
            {backlog.length > 0 && (
              <TaskStrip title={`Не розподілено (${backlog.length})`} className="text-muted-foreground">
                {backlog.map(task => (
                  <div key={task.id} className="w-56 shrink-0">
                    <TaskCard task={task} zone={null} actions={actions} />
                  </div>
                ))}
              </TaskStrip>
            )}
            {backlog.length > 0 && noDay.length > 0 && <div className="w-px shrink-0 bg-border" />}
            {noDay.length > 0 && (
              <TaskStrip title={`Без дня · ${sewer.name} (${noDay.length})`} className="text-amber-700">
                {noDay.map(task => (
                  <div key={task.id} className="w-56 shrink-0">
                    <TaskCard task={task} zone={null} sewer={sewer} actions={actions} />
                  </div>
                ))}
              </TaskStrip>
            )}
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-x-auto p-3">
          <div className="flex gap-2 h-full">
            {days.map((d, i) => {
              const key = dayKey(d)
              return (
                <DayColumn
                  key={key}
                  date={d}
                  index={i}
                  isToday={key === today}
                  sewer={sewer}
                  sewerTasks={tasks.filter(t => t.day === key && t.sewerId === sewer.id)}
                  poolTasks={tasks.filter(t => t.day === key && !t.sewerId)}
                  sewers={sewers}
                  actions={actions}
                />
              )
            })}
          </div>
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {draggingTask && (
          <div className="w-56 rotate-1 shadow-lg">
            <TaskCardBody task={draggingTask} sewer={sewers.find(s => s.id === draggingTask.sewerId)} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
