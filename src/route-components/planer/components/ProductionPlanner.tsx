import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from 'convex/_generated/api'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'
import {
  DndContext,
  useDraggable,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragMoveEvent,
} from '@dnd-kit/core'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { MyPopover } from '@/components/my-popover'
import { SEWER_COLORS, DAY_NAMES, DAY_START, DAY_END, DAY_MINS } from '../constants'
import { toDateStr, addDays, getMondayOf, snap15, fmtDur } from '../helpers'
import { usePlannerStore, type PlannedTask } from '../store'
import { useUpdateSewingSubTaskDates } from '../queries'

type Sewer = { id: string; name: string; color: string }

// ─── Config ───────────────────────────────────────────────────────────────────

const HOUR_W   = 72
const COL_W    = HOUR_W * (DAY_END - DAY_START)
const HOURS    = DAY_END - DAY_START
const TASK_H   = 34
const ROW_H    = 60
const HEADER_H = 68
const LABEL_W  = 148

// ─── Helpers ──────────────────────────────────────────────────────────────────

const minuteToPx = (min: number) => (min / 60) * HOUR_W

const pxToPosition = (px: number, dayStrs: string[]) => {
  const dayIdx      = Math.max(0, Math.min(4, Math.floor(px / COL_W)))
  const minuteRaw   = ((px % COL_W) / HOUR_W) * 60
  const startMinute = Math.max(0, Math.min(DAY_MINS - 15, snap15(minuteRaw)))
  return { startDate: dayStrs[dayIdx] ?? dayStrs[0], startMinute }
}

const taskLeft = (task: PlannedTask, dayStrs: string[]) => {
  const idx = dayStrs.indexOf(task.startDate)
  return idx === -1 ? -1 : idx * COL_W + minuteToPx(task.startMinute)
}

// ─── ColumnBg ────────────────────────────────────────────────────────────────

const ColumnBg = ({ dayStrs, today }: { dayStrs: string[]; today: string }) => (
  <>
    {dayStrs.map((ds) => (
      <div
        key={ds}
        style={{ width: COL_W }}
        className={cn('relative shrink-0 h-full border-r border-border/60 pointer-events-none', ds === today && 'bg-primary/5')}
      >
        {Array.from({ length: HOURS - 1 }, (_, h) => (
          <div
            key={h}
            className="absolute top-0 bottom-0 border-r border-border/25"
            style={{ left: (h + 1) * HOUR_W }}
          />
        ))}
      </div>
    ))}
  </>
)

// ─── DayHeaders ──────────────────────────────────────────────────────────────

const DayHeaders = ({ days, dayStrs, today, dailyLoad }: {
  days:      Date[]
  dayStrs:   string[]
  today:     string
  dailyLoad: Map<string, number>
}) => (
  <div className="flex border-b sticky top-0 z-10 bg-background" style={{ height: HEADER_H }}>
    <div style={{ width: LABEL_W }} className="shrink-0 border-r bg-muted/30 flex items-center px-3">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Виконавець</span>
    </div>
    {days.map((d, i) => {
      const ds      = dayStrs[i]
      const load    = Math.round((dailyLoad.get(ds) ?? 0) / DAY_MINS * 100)
      const isToday = ds === today
      return (
        <div
          key={ds}
          style={{ width: COL_W }}
          className={cn('shrink-0 flex flex-col border-r', isToday && 'bg-primary/5')}
        >
          <div className="flex items-center gap-2 px-2 pt-1.5 pb-1">
            <span className={cn('text-xs font-semibold', isToday ? 'text-primary' : 'text-foreground')}>
              {DAY_NAMES[i]}
            </span>
            <span className={cn('text-[11px]', isToday ? 'text-primary/70' : 'text-muted-foreground')}>
              {d.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' })}
            </span>
            {load > 0 && (
              <span className={cn(
                'ml-auto text-[10px] font-semibold',
                load > 100 ? 'text-red-500' : load > 70 ? 'text-amber-500' : 'text-emerald-500',
              )}>
                {load}%
              </span>
            )}
          </div>
          <div className="flex border-t border-border/30 mt-auto">
            {Array.from({ length: HOURS }, (_, h) => (
              <div
                key={h}
                style={{ width: HOUR_W }}
                className="shrink-0 flex items-center justify-start pl-0.5 border-r border-border/20 last:border-r-0"
              >
                <span className="text-[9px] text-muted-foreground/50 leading-none tabular-nums">
                  {DAY_START + h}
                </span>
              </div>
            ))}
          </div>
        </div>
      )
    })}
  </div>
)

// ─── TaskPopoverContent ───────────────────────────────────────────────────────

const TaskPopoverContent = ({ task }: { task: PlannedTask }) => {
  const c      = task.color
  const startH = Math.floor((DAY_START * 60 + task.startMinute) / 60)
  const startM = (DAY_START * 60 + task.startMinute) % 60
  const timeStr = `${startH}:${String(startM).padStart(2, '0')}`

  return (
    <div className="flex flex-col gap-1.5 min-w-[180px]">
      <div className="flex items-center gap-1.5">
        <span className="size-2 rounded-full shrink-0" style={{ background: c }} />
        <span className="text-[12px] font-semibold">#{task.orderNumber}</span>
      </div>
      <div className='flex gap-2 items-center'>
        <p className="text-[11px] text-muted-foreground">{task.specName}</p>
        {task.size && (
          <span className="self-start text-[10px] font-semibold px-1.5 py-0.5 rounded bg-muted border border-border/60 leading-none">
            {task.size}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 text-[11px] border-t border-border/40 pt-1.5">
        <span className="tabular-nums">{task.quantity} шт</span>
        <span className="text-muted-foreground tabular-nums">{fmtDur(task.durationMinutes)}</span>
        {task.isScheduled && (
          <span className="text-muted-foreground tabular-nums ml-auto">{task.startDate} {timeStr}</span>
        )}
      </div>
    </div>
  )
}

// ─── TaskBar ─────────────────────────────────────────────────────────────────

const TaskBar = ({ task, left, onCheck }: {
  task:    PlannedTask
  left:    number
  onCheck: () => void
}) => {
  const {
    listeners: moveListeners, attributes: moveAttrs, setNodeRef: setMoveRef, isDragging: isMoveActive,
  } = useDraggable({ id: task.sewingSubTaskId, data: { type: 'move' } })

  const width  = minuteToPx(task.durationMinutes)
  const top    = (ROW_H - TASK_H) / 2
  const narrow = width < 72
  const c      = task.color

  return (
    <MyPopover
      align="start"
      trigger={
        <div
          className={cn(
            'absolute rounded overflow-visible select-none cursor-pointer',
            isMoveActive && 'opacity-70 z-20',
            task.isDirty && 'ring-1 ring-inset ring-primary/50',
          )}
          style={{ left, top, width: Math.max(width - 2, 4), height: TASK_H }}
        >
          {/* visual background */}
          <div
            className="absolute inset-0 rounded pointer-events-none"
            style={{ backgroundColor: c + '18', border: `1.5px solid ${c}40` }}
          />
          {/* left accent */}
          <div className="absolute inset-y-0 left-0 w-[3px] rounded-l pointer-events-none" style={{ background: c }} />

          {/* move drag handle */}
          <div
            ref={setMoveRef}
            {...moveListeners}
            {...moveAttrs}
            className="absolute inset-0 cursor-grab active:cursor-grabbing"
          />

          {/* content */}
          {!narrow && (
            <div className="absolute inset-0 flex items-center gap-1 pl-2.5 pr-2 pointer-events-none">
              <span className="text-[11px] font-semibold truncate leading-none flex-1" style={{ color: c }}>
                #{task.orderNumber}
              </span>
              {task.size && (
                <span className="text-[9px] font-semibold px-1 py-0.5 rounded leading-none shrink-0" style={{ background: c + '25', color: c }}>
                  {task.size}
                </span>
              )}
              <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
                {fmtDur(task.durationMinutes)}
              </span>
            </div>
          )}

          {/* save button */}
          {task.isDirty && (
            <Button
              type="button"
              size="icon-sm"
              title="Зберегти"
              className="absolute -top-2.5 -right-2.5 z-10 size-5 rounded-full p-0"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onCheck() }}
            >
              <Check size={11} strokeWidth={3} />
            </Button>
          )}
        </div>
      }
      content={<TaskPopoverContent task={task} />}
    />
  )
}

// ─── UnscheduledPopover ───────────────────────────────────────────────────────

const UnscheduledPopover = ({
  x, tasks, onPlace, onClose,
}: {
  x:       number
  tasks:   PlannedTask[]
  onPlace: (id: string) => void
  onClose: () => void
}) => (
  <div
    className="absolute z-20 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[160px]"
    style={{ left: x, top: (ROW_H - TASK_H) / 2 - 4 }}
    onPointerDown={(e) => e.stopPropagation()}
  >
    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-2.5 pb-0.5 pt-1">
      Додати задачу
    </p>
    {tasks.map((t) => (
      <Button
        key={t.sewingSubTaskId}
        type="button"
        variant="ghost"
        size="sm"
        className="w-full flex items-center gap-2 px-2.5 py-1.5 h-auto justify-start text-[11px] rounded-none"
        onClick={() => { onPlace(t.sewingSubTaskId); onClose() }}
      >
        <span className="size-2 rounded-full shrink-0" style={{ background: t.color }} />
        <span className="truncate flex-1">#{t.orderNumber} · {t.specName}</span>
        <span className="text-muted-foreground shrink-0 tabular-nums">{t.quantity} шт</span>
      </Button>
    ))}
    <div className="border-t border-border/40 mt-0.5 pt-0.5">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-full h-7 text-[10px] text-muted-foreground"
        onClick={onClose}
      >
        Скасувати
      </Button>
    </div>
  </div>
)

// ─── SewerRow ────────────────────────────────────────────────────────────────

const SewerRow = ({ sewer, dayStrs, today }: {
  sewer:   Sewer
  dayStrs: string[]
  today:   string
}) => {
  const { mutateAsync: updateDates } = useUpdateSewingSubTaskDates()
  const storeTasks = usePlannerStore((s) => s.tasks)
  const tasks      = useMemo(
    () => Object.values(storeTasks).filter((t) => t.sewerId === sewer.id),
    [storeTasks, sewer.id],
  )
  const { schedule, markSaved } = usePlannerStore.getState()

  const scheduled   = useMemo(() => tasks.filter((t) => t.isScheduled), [tasks])
  const unscheduled = useMemo(() => tasks.filter((t) => !t.isScheduled), [tasks])
  const weekTotal   = useMemo(() => tasks.reduce((s, t) => s + t.quantity, 0), [tasks])

  const [popup, setPopup] = useState<{ x: number; startDate: string; startMinute: number } | null>(null)

  const handleCheck = useCallback(async (task: PlannedTask) => {
    if (!task.isScheduled) return
    const [y, mo, d] = task.startDate.split('-').map(Number)
    const startMs    = new Date(y, mo - 1, d, DAY_START + Math.floor(task.startMinute / 60), task.startMinute % 60).getTime()
    const endMs      = startMs + task.durationMinutes * 60_000
    await updateDates({ sewingSubTaskId: task.sewingSubTaskId as any, startDate: startMs, endDate: endMs })
    markSaved(task.sewingSubTaskId)
  }, [updateDates, markSaved])

  const handleTimelineClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return
    if (popup) { setPopup(null); return }
    if (unscheduled.length === 0) return

    const rect = e.currentTarget.getBoundingClientRect()
    const relX = e.clientX - rect.left
    const { startDate, startMinute } = pxToPosition(relX, dayStrs)

    if (unscheduled.length === 1) {
      schedule(unscheduled[0].sewingSubTaskId, startDate, startMinute)
    } else {
      setPopup({ x: relX, startDate, startMinute })
    }
  }, [dayStrs, unscheduled, schedule, popup])

  return (
    <div className="flex border-b" style={{ height: ROW_H }}>
      {/* Label */}
      <div
        style={{ width: LABEL_W }}
        className="shrink-0 border-r bg-background flex items-start px-2 gap-2 pt-2 sticky left-0 z-10"
      >
        <span
          className="size-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0 mt-0.5"
          style={{ background: sewer.color }}
        >
          {sewer.name[0]}
        </span>
        <div className="min-w-0 flex flex-col gap-0.5">
          <p className="text-sm font-medium leading-tight">{sewer.name}</p>
          {/* {weekTotal > 0 && (
            <p className="text-[11px] text-muted-foreground">{weekTotal} шт</p>
          )} */}
          {unscheduled.length > 0 && (
            <p className="text-[10px] text-amber-500">{unscheduled.length} не розп.</p>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div
        className="relative flex"
        style={{ width: 5 * COL_W, height: ROW_H, cursor: unscheduled.length > 0 ? 'cell' : 'default' }}
        onClick={handleTimelineClick}
      >
        <ColumnBg dayStrs={dayStrs} today={today} />

        {scheduled.map((task) => {
          const lx = taskLeft(task, dayStrs)
          if (lx < 0) return null
          return (
            <TaskBar
              key={task.sewingSubTaskId}
              task={task}
              left={lx}
              onCheck={() => handleCheck(task)}
            />
          )
        })}

        {popup && (
          <UnscheduledPopover
            x={popup.x}
            tasks={unscheduled}
            onPlace={(id) => schedule(id, popup.startDate, popup.startMinute)}
            onClose={() => setPopup(null)}
          />
        )}
      </div>
    </div>
  )
}

// ─── TodayLine ───────────────────────────────────────────────────────────────

const TodayLine = ({ dayStrs, today, totalH }: { dayStrs: string[]; today: string; totalH: number }) => {
  const idx = dayStrs.indexOf(today)
  if (idx === -1) return null
  const now    = new Date()
  const curMin = now.getHours() * 60 + now.getMinutes() - DAY_START * 60
  const leftPx = LABEL_W + idx * COL_W + minuteToPx(Math.max(0, Math.min(DAY_MINS, curMin)))
  return (
    <div
      className="absolute top-0 w-0.5 bg-primary/80 pointer-events-none z-10"
      style={{ left: leftPx, height: totalH }}
    />
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

const ProductionPlanner = () => {
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const monday  = getMondayOf(currentDate)
  const days    = useMemo(() => Array.from({ length: 5 }, (_, i) => addDays(monday, i)), [monday.toISOString()])
  const dayStrs = useMemo(() => days.map(toDateStr), [days])
  const today   = toDateStr(new Date())

  const { data: sewerData      = [] } = useQuery(convexQuery(api.queries.sewing.getSewerUsers, {}))
  const { data: plannerSubTasks = [] } = useQuery(convexQuery(api.queries.sewing.getPlannerSubTasks, {}))

  // Hydrate store from DB — only for tasks not already managed locally
  useEffect(() => {
    if (plannerSubTasks.length === 0) return
    const { assign, tasks } = usePlannerStore.getState()
    for (const pt of plannerSubTasks) {
      if (tasks[String(pt.sewingSubTaskId)]) continue

      let isScheduled = false
      let startDate   = ''
      let startMinute = 0

      if (pt.startDateMs) {
        const d   = new Date(pt.startDateMs)
        const min = d.getHours() * 60 + d.getMinutes() - DAY_START * 60
        if (min >= 0 && min < DAY_MINS) {
          isScheduled = true
          startDate   = toDateStr(d)
          startMinute = min
        }
      }

      assign({
        sewingSubTaskId: String(pt.sewingSubTaskId),
        sewerId:         String(pt.sewerId),
        isScheduled,
        startDate,
        startMinute,
        durationMinutes: Math.max(20, pt.quantity * 3),
        quantity:        pt.quantity,
        size:            pt.size ?? undefined,
        orderNumber:     pt.orderNumber,
        specName:        pt.specName,
        color:           pt.color,
      })
    }
  }, [plannerSubTasks])

  const sewers = useMemo<Sewer[]>(
    () => sewerData.map((u, i) => ({
      id:    u._id,
      name:  `${u.name} ${u.lastName}`.trim() || '—',
      color: SEWER_COLORS[i % SEWER_COLORS.length],
    })),
    [sewerData],
  )

  const storeTasks = usePlannerStore((s) => s.tasks)

  const dailyLoad = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of Object.values(storeTasks)) {
      if (t.isScheduled) map.set(t.startDate, (map.get(t.startDate) ?? 0) + t.durationMinutes)
    }
    return map
  }, [storeTasks])

  // Captures drag-start state; sewerPeers is the snapshot used as baseline for swap logic
  const initialDragRef = useRef<{
    taskId:     string
    initialLeft: number
    curWidth:    number
    sewerPeers:  PlannedTask[]
  } | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  )

  const handleDragStart = useCallback(({ active }: DragStartEvent) => {
    const taskId = active.id as string
    const task   = usePlannerStore.getState().tasks[taskId]
    if (!task?.isScheduled) return

    const sewerPeers = Object.values(usePlannerStore.getState().tasks)
      .filter((t) => t.isScheduled && t.sewerId === task.sewerId && t.sewingSubTaskId !== taskId)

    initialDragRef.current = {
      taskId,
      initialLeft: taskLeft(task, dayStrs),
      curWidth:    minuteToPx(task.durationMinutes),
      sewerPeers,
    }
  }, [dayStrs])

  const handleDragMove = useCallback(({ delta }: DragMoveEvent) => {
    const d = initialDragRef.current
    if (!d) return
    const { moveWithPush, moveWithSwap } = usePlannerStore.getState()

    const newLeft = Math.max(0, Math.min(5 * COL_W - d.curWidth, d.initialLeft + delta.x))
    const { startDate, startMinute } = pxToPosition(newLeft, dayStrs)

    if (delta.x < 0) {
      // Moving left → swap: recompute from the drag-start snapshot each time to prevent gap drift
      moveWithSwap(d.taskId, startDate, startMinute, d.sewerPeers)
    } else {
      // Moving right → push tasks forward
      moveWithPush(d.taskId, startDate, startMinute)
    }
  }, [dayStrs])

  const handleDragEnd = useCallback(() => { initialDragRef.current = null }, [])

  const totalH = HEADER_H + sewers.length * ROW_H
  const nav    = (dir: 1 | -1) => setCurrentDate((d) => addDays(d, dir * 7))

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragMove={handleDragMove} onDragEnd={handleDragEnd}>
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 px-3 py-2 border-b shrink-0">
          <Button variant="ghost" size="icon-sm" onClick={() => nav(-1)}><ChevronLeft size={16} /></Button>
          <span className="text-sm font-medium min-w-[180px] text-center">
            {monday.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' })}
            {' – '}
            {addDays(monday, 4).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
          <Button variant="ghost" size="icon-sm" onClick={() => nav(1)}><ChevronRight size={16} /></Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())} className="ml-1">
            Сьогодні
          </Button>
          <span className="ml-auto text-xs text-muted-foreground">
            {DAY_START}:00 – {DAY_END}:00
          </span>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="relative" style={{ width: LABEL_W + 5 * COL_W, height: totalH }}>
            <DayHeaders days={days} dayStrs={dayStrs} today={today} dailyLoad={dailyLoad} />
            <div style={{ marginTop: HEADER_H }}>
              {sewers.map((sewer) => (
                <SewerRow
                  key={sewer.id}
                  sewer={sewer}
                  dayStrs={dayStrs}
                  today={today}
                />
              ))}
            </div>
            <TodayLine dayStrs={dayStrs} today={today} totalH={totalH} />
          </div>
        </div>
      </div>
    </DndContext>
  )
}

export default ProductionPlanner
