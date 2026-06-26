import { useState, useMemo, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

export type TaskStatus = 'new' | 'in_progress' | 'done' | 'delayed'
export type DeptKey = 'cutting' | 'sewing' | 'branding' | 'packaging' | 'subcontractor'

export type GanttTask = {
  id: string
  label: string
  dept: DeptKey
  startDate: string  // yyyy-mm-dd
  endDate: string    // yyyy-mm-dd
  status: TaskStatus
  capacity: number
}

export type GanttRow = {
  orderId: string
  orderLabel: string
  orderDeadline?: string  // yyyy-mm-dd — client deadline (planning deadline is derived from last task)
  tasks: GanttTask[]
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const INITIAL_ROWS: GanttRow[] = [
  {
    orderId: 'ord-1',
    orderLabel: '#1042 — Adidas / 120 шт',
    orderDeadline: '2026-05-05',
    tasks: [
      { id: 't1', label: 'Розкрій',    dept: 'cutting',       startDate: '2026-04-21', endDate: '2026-04-23', status: 'done',        capacity: 60  },
      { id: 't2', label: 'Пошив',      dept: 'sewing',        startDate: '2026-04-23', endDate: '2026-04-28', status: 'in_progress', capacity: 100 },
      { id: 't3', label: 'Брендування',dept: 'branding',      startDate: '2026-04-28', endDate: '2026-04-30', status: 'new',         capacity: 40  },
      { id: 't4', label: 'Пакування',  dept: 'packaging',     startDate: '2026-04-30', endDate: '2026-05-01', status: 'new',         capacity: 20  },
    ],
  },
  {
    orderId: 'ord-2',
    orderLabel: '#1043 — Nike / 80 шт',
    orderDeadline: '2026-05-04',
    tasks: [
      { id: 't5', label: 'Розкрій',   dept: 'cutting',       startDate: '2026-04-22', endDate: '2026-04-24', status: 'done',        capacity: 50 },
      { id: 't6', label: 'Підрядник', dept: 'subcontractor', startDate: '2026-04-24', endDate: '2026-04-29', status: 'in_progress', capacity: 80 },
      { id: 't7', label: 'Пошив',     dept: 'sewing',        startDate: '2026-04-29', endDate: '2026-05-03', status: 'new',         capacity: 60 },
      { id: 't8', label: 'Пакування', dept: 'packaging',     startDate: '2026-05-03', endDate: '2026-05-04', status: 'new',         capacity: 15 },
    ],
  },
  {
    orderId: 'ord-3',
    orderLabel: '#1044 — Puma / 200 шт',
    orderDeadline: '2026-05-12',
    tasks: [
      { id: 't9',  label: 'Розкрій',    dept: 'cutting',   startDate: '2026-04-25', endDate: '2026-04-28', status: 'delayed', capacity: 90  },
      { id: 't10', label: 'Пошив',      dept: 'sewing',    startDate: '2026-04-28', endDate: '2026-05-06', status: 'new',     capacity: 120 },
      { id: 't11', label: 'Брендування',dept: 'branding',  startDate: '2026-05-06', endDate: '2026-05-08', status: 'new',     capacity: 60  },
      { id: 't12', label: 'Пакування',  dept: 'packaging', startDate: '2026-05-08', endDate: '2026-05-09', status: 'new',     capacity: 30  },
    ],
  },
  {
    orderId: 'ord-4',
    orderLabel: '#1045 — Under Armour / 50 шт',
    orderDeadline: '2026-05-03',
    tasks: [
      { id: 't13', label: 'Розкрій',  dept: 'cutting',   startDate: '2026-04-27', endDate: '2026-04-28', status: 'in_progress', capacity: 40 },
      { id: 't14', label: 'Пошив',    dept: 'sewing',    startDate: '2026-04-28', endDate: '2026-05-02', status: 'new',         capacity: 70 },
      { id: 't15', label: 'Пакування',dept: 'packaging', startDate: '2026-05-02', endDate: '2026-05-03', status: 'new',         capacity: 20 },
    ],
  },
]

// ─── Constants ────────────────────────────────────────────────────────────────

const DEPT_COLORS: Record<DeptKey, string> = {
  cutting:       'bg-blue-500',
  sewing:        'bg-violet-500',
  branding:      'bg-orange-500',
  packaging:     'bg-emerald-500',
  subcontractor: 'bg-pink-500',
}

const DEPTS: { key: DeptKey; label: string }[] = [
  { key: 'cutting',       label: 'Розкрій'     },
  { key: 'sewing',        label: 'Пошив'        },
  { key: 'branding',      label: 'Брендування'  },
  { key: 'packaging',     label: 'Пакування'    },
  { key: 'subcontractor', label: 'Підрядник'    },
]

const STATUS_OPACITY: Record<TaskStatus, string> = {
  done:        'opacity-50',
  in_progress: 'opacity-100',
  new:         'opacity-60',
  delayed:     'opacity-100',
}

const STATUS_BORDER: Record<TaskStatus, string> = {
  done:        '',
  in_progress: '',
  new:         '',
  delayed:     'ring-2 ring-red-500',
}

const COL_WIDTH    = 40  // px per day
const DAYS_VISIBLE = 30
const HEADER_H     = 56  // day-header row height, px
const ORDER_H      = 52  // order group-header row height, px
const TASK_H       = 40  // task row height, px

const DAY_ABBR = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseDate(s: string) { return new Date(s + 'T00:00:00') }
function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function addDays(d: Date, n: number) {
  const r = new Date(d); r.setDate(r.getDate() + n); return r
}

function daysBetween(a: string, b: string) {
  return Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 86400000)
}

function shiftDateStr(s: string, n: number) {
  return toDateStr(addDays(parseDate(s), n))
}

function formatDay(d: Date) {
  return d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })
}

function orderSpan(tasks: GanttTask[]) {
  return {
    start: tasks.reduce((m, t) => t.startDate < m ? t.startDate : m, tasks[0].startDate),
    end:   tasks.reduce((m, t) => t.endDate   > m ? t.endDate   : m, tasks[0].endDate),
  }
}

// ─── ColumnBg ─────────────────────────────────────────────────────────────────

function ColumnBg({ days, today, tint, dailyLoad }: { days: Date[]; today: string; tint?: boolean; dailyLoad?: Map<string, number> }) {
  return (
    <>
      {days.map(d => {
        const ds = toDateStr(d)
        const isWeekend  = d.getDay() === 0 || d.getDay() === 6
        const isOverload = (dailyLoad?.get(ds) ?? 0) >= 100
        return (
          <div
            key={ds}
            style={{ width: COL_WIDTH }}
            className={cn(
              'shrink-0 h-full border-r',
              isOverload
                ? (tint ? 'bg-red-100/60' : 'bg-red-100/80')
                : tint
                  ? [ds === today && 'bg-blue-50/50', isWeekend && ds !== today && 'bg-gray-200/30']
                  : [ds === today && 'bg-blue-50',    isWeekend && ds !== today && 'bg-gray-50'],
            )}
          />
        )
      })}
    </>
  )
}

// ─── DraggableBar ─────────────────────────────────────────────────────────────

function DraggableBar({ task, left, width, isSelected, onSelect, onDragEnd, onResizeEnd }: {
  task: GanttTask
  left: number
  width: number
  isSelected: boolean
  onSelect: (taskId: string) => void
  onDragEnd: (taskId: string, deltaDays: number) => void
  onResizeEnd: (taskId: string, deltaStart: number, deltaEnd: number) => void
}) {
  const timelineLeftRef = useRef(0)
  const [visualOffset,     setVisualOffset]     = useState(0)
  const [visualWidthDelta, setVisualWidthDelta] = useState(0)
  const [isDragging,       setIsDragging]       = useState(false)

  // drag the whole bar
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    timelineLeftRef.current = (e.currentTarget as HTMLElement).getBoundingClientRect().left - left
    setIsDragging(true)

    function col(x: number) { return Math.floor((x - timelineLeftRef.current) / COL_WIDTH) }
    const startCol = col(e.clientX)

    function onMove(ev: MouseEvent) { setVisualOffset((col(ev.clientX) - startCol) * COL_WIDTH) }
    function onUp(ev: MouseEvent) {
      const delta = col(ev.clientX) - startCol
      setVisualOffset(0); setIsDragging(false)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      if (delta === 0) onSelect(task.id)
      else onDragEnd(task.id, delta)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [task.id, left, onSelect, onDragEnd])

  // resize left edge → changes startDate
  const onLeftHandleDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    timelineLeftRef.current = (e.currentTarget as HTMLElement).parentElement!.getBoundingClientRect().left - left

    function col(x: number) { return Math.floor((x - timelineLeftRef.current) / COL_WIDTH) }
    const startCol = col(e.clientX)
    const maxDelta = Math.floor(width / COL_WIDTH) - 1

    function onMove(ev: MouseEvent) {
      const d = Math.min(col(ev.clientX) - startCol, maxDelta)
      setVisualOffset(d * COL_WIDTH)
      setVisualWidthDelta(-d * COL_WIDTH)
    }
    function onUp(ev: MouseEvent) {
      const d = Math.min(col(ev.clientX) - startCol, maxDelta)
      setVisualOffset(0); setVisualWidthDelta(0)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      if (d !== 0) onResizeEnd(task.id, d, 0)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [task.id, left, width, onResizeEnd])

  // resize right edge → changes endDate
  const onRightHandleDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    timelineLeftRef.current = (e.currentTarget as HTMLElement).parentElement!.getBoundingClientRect().left - left

    function col(x: number) { return Math.floor((x - timelineLeftRef.current) / COL_WIDTH) }
    const startCol = col(e.clientX)
    const minDelta = -(Math.floor(width / COL_WIDTH) - 1)

    function onMove(ev: MouseEvent) {
      const d = Math.max(col(ev.clientX) - startCol, minDelta)
      setVisualWidthDelta(d * COL_WIDTH)
    }
    function onUp(ev: MouseEvent) {
      const d = Math.max(col(ev.clientX) - startCol, minDelta)
      setVisualWidthDelta(0)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      if (d !== 0) onResizeEnd(task.id, 0, d)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [task.id, left, width, onResizeEnd])

  const isActive = isDragging || visualWidthDelta !== 0

  return (
    <div
      onMouseDown={onMouseDown}
      title={`${task.label} · ${task.startDate} → ${task.endDate}`}
      style={{
        left: left + visualOffset,
        width: width + visualWidthDelta,
        top: 6, height: 28, position: 'absolute',
        transition: isActive ? 'none' : 'left 0.12s ease',
        zIndex: isActive ? 20 : 1,
      }}
      className={cn(
        'rounded flex items-center text-white text-[10px] font-medium select-none',
        'cursor-grab active:cursor-grabbing',
        isActive && 'shadow-lg',
        isSelected && 'ring-2 ring-orange-500 ring-offset-1 ring-offset-transparent',
        DEPT_COLORS[task.dept],
        STATUS_OPACITY[task.status],
        STATUS_BORDER[task.status],
      )}
    >
      {/* left resize handle */}
      <div
        onMouseDown={onLeftHandleDown}
        className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-black/20 rounded-l"
      />
      <span className="px-3 truncate pointer-events-none">{task.label}</span>
      {/* right resize handle */}
      <div
        onMouseDown={onRightHandleDown}
        className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-black/20 rounded-r"
      />
    </div>
  )
}

// ─── DayHeaders ───────────────────────────────────────────────────────────────

function DayHeaders({ days, today, dailyLoad }: {
  days: Date[]
  today: string
  dailyLoad: Map<string, number>
}) {
  return (
    <div className="flex border-b bg-gray-50" style={{ height: HEADER_H }}>
      {days.map(d => {
        const ds = toDateStr(d)
        const isToday   = ds === today
        const isWeekend = d.getDay() === 0 || d.getDay() === 6
        const load      = Math.round(dailyLoad.get(ds) ?? 0)
        return (
          <div
            key={ds}
            style={{ width: COL_WIDTH }}
            className={cn(
              'shrink-0 flex flex-col items-center justify-center gap-0.5 border-r text-[10px] leading-tight',
              isToday   && 'bg-blue-50 font-bold text-blue-600',
              isWeekend && !isToday && 'text-gray-400',
            )}
          >
            <span>{DAY_ABBR[d.getDay()]}</span>
            <span>{d.getDate()}</span>
            {load > 0 && (
              <span className={cn('text-[9px] font-semibold leading-none',
                load > 100 ? 'text-red-500' : load > 35 ? 'text-orange-400' : 'text-green-400'
              )}>
                {load}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── TodayLine ────────────────────────────────────────────────────────────────

function TodayLine({ days, today, windowStart }: { days: Date[]; today: string; windowStart: string }) {
  const windowEnd = toDateStr(days[days.length - 1])
  if (today < windowStart || today > windowEnd) return null
  return (
    <div
      style={{
        position: 'absolute', top: HEADER_H, bottom: 0, width: 2,
        left: daysBetween(windowStart, today) * COL_WIDTH + COL_WIDTH / 2,
      }}
      className="bg-blue-500 pointer-events-none z-10"
    />
  )
}

// ─── LeftPanel ────────────────────────────────────────────────────────────────

function LeftPanel({ rows, expandedOrders, onToggle, deptFilter }: {
  rows: GanttRow[]
  expandedOrders: Set<string>
  onToggle: (orderId: string) => void
  deptFilter: Set<DeptKey>
}) {
  return (
    <div className="shrink-0 w-48 border-r">
      <div style={{ height: HEADER_H }} className="border-b bg-gray-50" />
      {rows.map(row => {
        const isExpanded  = expandedOrders.has(row.orderId)
        const visibleTasks = isExpanded
          ? (deptFilter.size === 0 ? row.tasks : row.tasks.filter(t => deptFilter.has(t.dept)))
          : []
        return (
          <div key={row.orderId}>
            <button
              onClick={() => onToggle(row.orderId)}
              style={{ height: ORDER_H }}
              className="w-full flex items-center gap-1.5 px-2 bg-gray-100 border-b hover:bg-gray-200 transition-colors text-left"
              title={row.orderLabel}
            >
              <ChevronDown className={cn('w-3 h-3 shrink-0 text-gray-400 transition-transform duration-150', !isExpanded && '-rotate-90')} />
              <div className="flex flex-col min-w-0">
                <span className="truncate font-semibold text-[11px] text-gray-700 leading-tight">{row.orderLabel}</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-blue-500 leading-none whitespace-nowrap">
                    ◈ {formatDay(parseDate(orderSpan(row.tasks).end))}
                  </span>
                  {row.orderDeadline && (
                    <span className="text-[10px] text-orange-500 leading-none whitespace-nowrap">
                      ⚑ {formatDay(parseDate(row.orderDeadline))}
                    </span>
                  )}
                </div>
              </div>
            </button>

            {visibleTasks.map(task => (
              <div
                key={task.id}
                style={{ height: TASK_H }}
                className="flex items-center gap-2 pl-5 pr-2 border-b text-[11px] text-gray-500"
              >
                <span className={cn('w-2 h-2 rounded-sm shrink-0', DEPT_COLORS[task.dept])} />
                <span className="truncate">{task.label}</span>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

// ─── OrderGroup ───────────────────────────────────────────────────────────────

function OrderGroup({ row, days, today, windowStart, windowEnd, isExpanded, selectedTasks, onSelect, onDragEnd, onResizeEnd, deptFilter, dailyLoad }: {
  row: GanttRow
  days: Date[]
  today: string
  windowStart: string
  windowEnd: string
  isExpanded: boolean
  selectedTasks: Set<string>
  onSelect: (taskId: string) => void
  onDragEnd: (taskId: string, deltaDays: number) => void
  onResizeEnd: (taskId: string, deltaStart: number, deltaEnd: number) => void
  deptFilter: Set<DeptKey>
  dailyLoad: Map<string, number>
}) {
  const { start: spanStart, end: spanEnd } = orderSpan(row.tasks)

  const doneCount    = row.tasks.filter(t => t.status === 'done').length
  const totalCount   = row.tasks.length
  const visibleTasks = isExpanded
    ? (deptFilter.size === 0 ? row.tasks : row.tasks.filter(t => deptFilter.has(t.dept)))
    : []

  // unified summary bar geometry
  const clientEnd  = row.orderDeadline
  const isLate     = !!clientEnd && spanEnd > clientEnd
  const barEnd     = clientEnd && clientEnd > spanEnd ? clientEnd : spanEnd
  const barVisStart = spanStart < windowStart ? windowStart : spanStart
  const barVisEnd   = barEnd > windowEnd ? windowEnd : barEnd
  const barHidden   = barVisStart >= windowEnd || barVisEnd <= windowStart
  const barOffset   = daysBetween(windowStart, barVisStart)
  const totalBarW   = Math.max(1, daysBetween(barVisStart, barVisEnd))

  // solid (blue) section ends at clientEnd when late, at spanEnd when buffer
  const solidEnd    = isLate && clientEnd ? clientEnd : spanEnd
  const planSectionW  = Math.max(0, Math.min(daysBetween(barVisStart, solidEnd), totalBarW))
  const extraSectionW = totalBarW - planSectionW

  // extra section: red when late (planning overflows deadline), striped when buffer
  const extraBg = isLate
    ? 'rgba(248,113,113,0.75)'
    : 'repeating-linear-gradient(45deg,rgba(96,165,250,0.45),rgba(96,165,250,0.45) 4px,rgba(219,234,254,0.55) 4px,rgba(219,234,254,0.55) 9px)'

  return (
    <div>
      {/* order header — always visible, unified summary bar */}
      <div className="relative flex border-b bg-gray-100" style={{ height: ORDER_H }}>
        <ColumnBg days={days} today={today} tint dailyLoad={dailyLoad} />

        {!barHidden && (
          <div
            style={{ position: 'absolute', left: barOffset * COL_WIDTH, width: totalBarW * COL_WIDTH - 2, top: ORDER_H / 2 - 9, height: 22, borderRadius: 4, overflow: 'hidden', display: 'flex' }}
            className="pointer-events-none"
          >
            {/* solid planning section */}
            <div
              style={{ width: planSectionW * COL_WIDTH, flexShrink: 0 }}
              className="bg-blue-400/70 flex items-center gap-1.5 px-1.5 overflow-hidden"
            >
              <span className="text-white text-[10px] font-medium truncate whitespace-nowrap">
                {formatDay(parseDate(spanStart))} – {formatDay(parseDate(spanEnd))}
              </span>
              <span className="text-white/70 text-[10px] shrink-0 tabular-nums">
                {doneCount}/{totalCount}
              </span>
            </div>
            {/* extra section: buffer (striped) or late (red) */}
            {extraSectionW > 0 && (
              <div style={{ flex: 1, background: extraBg }} />
            )}
          </div>
        )}
      </div>

      {visibleTasks.map(task => {
        const visStart   = task.startDate < windowStart ? windowStart : task.startDate
        const visEnd     = task.endDate   > windowEnd   ? windowEnd   : task.endDate
        const isHidden   = visStart >= windowEnd || visEnd <= windowStart
        const offsetDays = daysBetween(windowStart, visStart)
        const widthDays  = Math.max(1, daysBetween(visStart, visEnd))

        return (
          <div key={task.id} className="relative flex border-b" style={{ height: TASK_H }}>
            <ColumnBg days={days} today={today} dailyLoad={dailyLoad} />
            {!isHidden && (
              <DraggableBar
                task={task}
                left={offsetDays * COL_WIDTH}
                width={widthDays * COL_WIDTH - 2}
                isSelected={selectedTasks.has(task.id)}
                onSelect={onSelect}
                onDragEnd={onDragEnd}
                onResizeEnd={onResizeEnd}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── GanttControls ────────────────────────────────────────────────────────────

function GanttControls({ windowStart, windowEnd, onShift, onToday, selectedCount, onClearSelection, deptFilter, onToggleDept }: {
  windowStart: string
  windowEnd: string
  onShift: (n: number) => void
  onToday: () => void
  selectedCount: number
  onClearSelection: () => void
  deptFilter: Set<DeptKey>
  onToggleDept: (dept: DeptKey) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <button onClick={() => onShift(-7)} className="p-1 rounded hover:bg-gray-100">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button onClick={onToday} className="px-2 py-0.5 rounded border text-xs hover:bg-gray-50">
          Сьогодні
        </button>
        <button onClick={() => onShift(7)} className="p-1 rounded hover:bg-gray-100">
          <ChevronRight className="w-4 h-4" />
        </button>
        <span className="text-gray-500 text-xs">
          {formatDay(parseDate(windowStart))} — {formatDay(parseDate(windowEnd))}
        </span>

        {selectedCount > 0 && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-blue-600 font-medium">
              {selectedCount} {selectedCount === 1 ? 'таска' : 'таски'} виділено — рухаються разом
            </span>
            <button
              onClick={onClearSelection}
              className="px-2 py-0.5 rounded border border-gray-200 text-xs text-gray-500 hover:bg-gray-50"
            >
              Скасувати
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-[11px] text-gray-400 mr-0.5">Відділ:</span>
        {DEPTS.map(dept => {
          const active = deptFilter.size === 0 || deptFilter.has(dept.key)
          return (
            <button
              key={dept.key}
              onClick={() => onToggleDept(dept.key)}
              className={cn(
                'flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] transition-colors',
                deptFilter.has(dept.key)
                  ? 'border-transparent text-white'
                  : deptFilter.size === 0
                    ? 'border-gray-200 text-gray-600 hover:border-gray-300'
                    : 'border-gray-200 text-gray-300 hover:border-gray-300',
              )}
              style={deptFilter.has(dept.key) ? { background: 'orange' } : undefined}
            >
              <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', active ? DEPT_COLORS[dept.key] : 'bg-gray-300')} />
              {dept.label}
            </button>
          )
        })}
        {deptFilter.size > 0 && (
          <button
            onClick={() => DEPTS.forEach(d => deptFilter.has(d.key) && onToggleDept(d.key))}
            className="ml-1 px-2 py-0.5 rounded-full border border-gray-200 text-[11px] text-gray-400 hover:text-gray-600"
          >
            ✕ Скинути
          </button>
        )}
      </div>
    </div>
  )
}

// ─── MyGantt ─────────────────────────────────────────────────────────────────

export function MyGantt() {
  const today = toDateStr(new Date())

  const [rows, setRows] = useState<GanttRow[]>(INITIAL_ROWS)

  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set())

  function handleSelect(taskId: string) {
    setSelectedTasks(prev => {
      const next = new Set(prev)
      next.has(taskId) ? next.delete(taskId) : next.add(taskId)
      return next
    })
  }

  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(
    () => new Set(INITIAL_ROWS.map(r => r.orderId))
  )

  function handleToggle(orderId: string) {
    setExpandedOrders(prev => {
      const next = new Set(prev)
      next.has(orderId) ? next.delete(orderId) : next.add(orderId)
      return next
    })
  }

  const [deptFilter, setDeptFilter] = useState<Set<DeptKey>>(new Set())

  function handleToggleDept(dept: DeptKey) {
    setDeptFilter(prev => {
      const next = new Set(prev)
      next.has(dept) ? next.delete(dept) : next.add(dept)
      return next
    })
  }

  const [windowStart, setWindowStart] = useState(() =>
    toDateStr(addDays(new Date(), -7))
  )

  const days = useMemo(() => {
    const start = parseDate(windowStart)
    return Array.from({ length: DAYS_VISIBLE }, (_, i) => addDays(start, i))
  }, [windowStart])

  const windowEnd = toDateStr(days[days.length - 1])

  const dailyLoad = useMemo(() => {
    const map = new Map<string, number>()
    for (const row of rows) {
      for (const task of row.tasks) {
        const dur    = Math.max(1, daysBetween(task.startDate, task.endDate))
        const perDay = task.capacity / dur
        for (let i = 0; i < dur; i++) {
          const day = toDateStr(addDays(parseDate(task.startDate), i))
          map.set(day, (map.get(day) ?? 0) + perDay)
        }
      }
    }
    return map
  }, [rows])

  const handleResizeEnd = useCallback((taskId: string, deltaStart: number, deltaEnd: number) => {
    setRows(prev => prev.map(row => ({
      ...row,
      tasks: row.tasks.map(t => t.id !== taskId ? t : {
        ...t,
        startDate: deltaStart !== 0 ? shiftDateStr(t.startDate, deltaStart) : t.startDate,
        endDate:   deltaEnd   !== 0 ? shiftDateStr(t.endDate,   deltaEnd)   : t.endDate,
      }),
    })))
  }, [])

  const handleDragEnd = useCallback((taskId: string, deltaDays: number) => {
    setRows(prev => prev.map(row => ({
      ...row,
      tasks: row.tasks.map(t => {
        const shouldShift = t.id === taskId || (selectedTasks.has(taskId) && selectedTasks.has(t.id))
        return shouldShift ? { ...t, startDate: shiftDateStr(t.startDate, deltaDays), endDate: shiftDateStr(t.endDate, deltaDays) } : t
      }),
    })))
  }, [selectedTasks])

  function handleShift(n: number) {
    setWindowStart(prev => toDateStr(addDays(parseDate(prev), n)))
  }

  function handleToday() {
    setWindowStart(toDateStr(addDays(new Date(), -7)))
  }

  const totalWidth = DAYS_VISIBLE * COL_WIDTH

  return (
    <div className="flex flex-col gap-2 p-4 text-sm select-none">
      <GanttControls
        windowStart={windowStart}
        windowEnd={windowEnd}
        onShift={handleShift}
        onToday={handleToday}
        selectedCount={selectedTasks.size}
        onClearSelection={() => setSelectedTasks(new Set())}
        deptFilter={deptFilter}
        onToggleDept={handleToggleDept}
      />

      <div className="overflow-x-auto border rounded-lg">
        <div className="flex" style={{ minWidth: 192 + totalWidth }}>
          <LeftPanel rows={rows} expandedOrders={expandedOrders} onToggle={handleToggle} deptFilter={deptFilter} />

          <div className="relative overflow-hidden" style={{ width: totalWidth }}>
            <DayHeaders days={days} today={today} dailyLoad={dailyLoad} />

            {rows.map(row => (
              <OrderGroup
                key={row.orderId}
                row={row}
                days={days}
                today={today}
                windowStart={windowStart}
                windowEnd={windowEnd}
                isExpanded={expandedOrders.has(row.orderId)}
                selectedTasks={selectedTasks}
                onSelect={handleSelect}
                onDragEnd={handleDragEnd}
                onResizeEnd={handleResizeEnd}
                deptFilter={deptFilter}
                dailyLoad={dailyLoad}
              />
            ))}

            <TodayLine days={days} today={today} windowStart={windowStart} />
          </div>
        </div>
      </div>
    </div>
  )
}
