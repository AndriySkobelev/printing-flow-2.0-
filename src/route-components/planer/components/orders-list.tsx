import { useState, useContext, useEffect } from 'react'
import { UTCDate } from '@date-fns/utc'
import { ProgressBar } from '@/components/progress-bar'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from 'convex/_generated/api'
import { type FunctionReturnType } from 'convex/server'
import { Search, ChevronRight, Plus, Minus, Undo2, SplitSquareHorizontal, UserPlus, Sparkles, CalendarDays } from 'lucide-react'
import { format } from 'date-fns'
import { uk } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ActionsMenu } from '@/components/actions-menu'
import { MyPopover } from '@/components/my-popover'
import { Calendar } from '@/components/ui/calendar'
import { Checkbox } from '@/components/ui/check-box'
import { DialogContext } from '@/contexts/dialog'
import { BRANDING_TYPES, BRANDING_LABELS } from '@/route-components/order-details/types'
import { usePlannerStore } from '../store'
import { taskDurationMinutes, fmtDur } from '../helpers'
import { useUpdateSewingSubTaskAssignee, useSplitSewingSubTask, useUpdateSewingTaskStatus, useToggleSewingSubTaskExtraWork, useMergeSewingSubTaskIntoParent, useSetSewingSubTaskDay, useBulkAssignSewingSubTasks, useBulkSetSewingSubTaskDay, useBulkSetSewingSubTaskExtraWork } from '../queries'
import { OrderInfoPanel } from './order-info-panel'

// ─── Types ───────────────────────────────────────────────────────────────────

type SewingTaskRow = NonNullable<FunctionReturnType<typeof api.queries.sewing.getSewingTasksWithCuttingProgress>>[number]
type SubTaskRow    = SewingTaskRow['subTasks'][number]
type CuttingLog    = SewingTaskRow['cuttingProgress']['logs'][number]

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_DOT: Record<string, string> = {
  new:         'bg-blue-400',
  in_progress: 'bg-amber-400',
  done:        'bg-green-500',
  paused:      'bg-gray-400',
  distributed: 'bg-violet-400',
}

const STATUS_LABEL: Record<string, string> = {
  new:         'Новий',
  in_progress: 'В роботі',
  done:        'Готово',
  paused:      'Пауза',
  distributed: 'Розподілено',
}

// The only statuses a planner can manually toggle between on a sewing task —
// in_progress/done/paused come from elsewhere in the task's lifecycle.
const TOGGLABLE_STATUSES = new Set(['new', 'distributed'])

// Statuses a sewingTask can actually hold (taskSewingStatus in the schema).
const STATUS_FILTER_OPTIONS = ['new', 'distributed', 'in_progress', 'done', 'paused'] as const

const formatDate = (ts?: number | null) =>
  ts ? new UTCDate(ts).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' }) : '—'

// Whole calendar days between today and the given timestamp (negative once it's overdue).
const daysUntil = (ts?: number | null) => {
  if (!ts) return null
  const end   = new UTCDate(ts)
  const now   = new UTCDate()
  const endDay = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate())
  const today  = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  return Math.round((endDay - today) / 86_400_000)
}

const endDateColor = (ts?: number | null) => {
  const days = daysUntil(ts)
  if (days === null) return 'text-muted-foreground'
  if (days < 0)  return 'text-red-500 font-semibold'
  if (days <= 2) return 'text-amber-500 font-semibold'
  return 'text-muted-foreground'
}

const formatTime = (ts: number) =>
  new UTCDate(ts).toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })


// ─── CuttingLogsPanel ────────────────────────────────────────────────────────

const CuttingLogsPanel = ({ logs }: { logs: CuttingLog[] }) => {
  if (logs.length === 0)
    return <p className="text-[11px] text-muted-foreground text-center py-2">Немає записів</p>

  return (
    <div className="flex flex-col divide-y divide-border/40">
      {logs.map((log, i) => (
        <div key={i} className="flex items-center gap-2 py-1 text-[11px]">
          <span className="text-muted-foreground tabular-nums shrink-0">{formatTime(log.timestamp)}</span>
          <span className="font-medium truncate flex-1">{log.specName}</span>
          <span className="text-muted-foreground shrink-0">{log.color}</span>
          <span className="text-muted-foreground shrink-0">{log.size}</span>
          <span className="font-semibold tabular-nums shrink-0">{log.quantity} шт</span>
        </div>
      ))}
    </div>
  )
}

// ─── SubTaskDayPicker ─────────────────────────────────────────────────────────

// The day a sub-task is sewn on — its startDate, stored as UTC midnight (the
// calendar works in local dates, so the y/m/d are carried over as-is).
const SubTaskDayPicker = ({ value, onChange, trigger }: {
  value:    number | null | undefined
  onChange: (ms: number | null) => void
  trigger?: React.ReactNode
}) => {
  const [open, setOpen] = useState(false)
  const utc      = value != null ? new UTCDate(value) : null
  const selected = utc ? new Date(utc.getFullYear(), utc.getMonth(), utc.getDate()) : undefined

  return (
    <MyPopover
      align="end"
      open={open}
      onOpenChange={setOpen}
      trigger={trigger ?? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            'h-6 shrink-0 gap-1 px-1.5 text-[12px] tabular-nums',
            utc ? 'border-primary/40 bg-primary/5 text-primary font-medium hover:bg-primary/10 hover:text-primary' : 'font-normal text-muted-foreground',
          )}
        >
          <CalendarDays className="size-3" />
          {utc ? format(utc, 'EEEEEE, dd.MM.yyyy', { locale: uk }) : 'Дата'}
        </Button>
      )}
      content={
        <div className="flex flex-col gap-1">
          <Calendar
            mode="single"
            selected={selected}
            defaultMonth={selected}
            weekStartsOn={1}
            onSelect={(d) => {
              onChange(d ? Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) : null)
              setOpen(false)
            }}
          />
          {(utc || trigger) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-destructive hover:text-destructive"
              onClick={() => { onChange(null); setOpen(false) }}
            >
              Прибрати дату
            </Button>
          )}
        </div>
      }
    />
  )
}

// ─── SubTaskItem ─────────────────────────────────────────────────────────────

// Look of an on/off item in a sub-menu: "+" to add, highlighted with "−" once on.
// Both icons stay mounted (one hidden) — swapping them in an open menu breaks the DOM.
const toggleItemIcon = (isOn: boolean) => (
  <span className="flex shrink-0">
    <Plus  className={cn('size-2.5 text-foreground', isOn && 'hidden')} />
    <Minus className={cn('size-2.5 text-foreground', !isOn && 'hidden')} />
  </span>
)

// my-0.5 keeps neighbouring highlighted rows from merging into one block.
const toggleItemClass = (isOn: boolean) =>
  cn('my-0.5', isOn && 'bg-violet-50 text-violet-700 focus:bg-violet-100 focus:text-violet-800')

type TaskMeta = { orderNumber: string; specName: string; color: string }

type SewerUser = { _id: string; name: string; lastName: string }

type ExtraWork = FunctionReturnType<typeof api.queries.extraWorks.getExtraWorks>[number]

type SubTaskProps = {
  sub:              SubTaskRow
  taskMeta:         TaskMeta
  sewerUsers:       SewerUser[]
  extraWorks:       ExtraWork[]
  canMerge:         boolean
  isSelected:       boolean
  onToggleSelect:   () => void
  splitId:          string | null
  splitQty:         string
  onSplit:          (id: string) => void
  onSplitQtyChange: (v: string) => void
  onSplitConfirm:   () => void
  onSplitCancel:    () => void
}

const SubTaskItem = ({
  sub, taskMeta, sewerUsers, extraWorks, canMerge, isSelected, onToggleSelect, splitId, splitQty,
  onSplit, onSplitQtyChange, onSplitConfirm, onSplitCancel,
}: SubTaskProps) => {
  const { mutate: updateAssignee }  = useUpdateSewingSubTaskAssignee()
  const { mutate: toggleExtraWork } = useToggleSewingSubTaskExtraWork()
  const { mutate: mergeIntoParent } = useMergeSewingSubTaskIntoParent()
  const { mutate: setDay }          = useSetSewingSubTaskDay()
  const { assign, unassign, setDuration } = usePlannerStore.getState()

  const subExtraWorks = sub.extraWorks ?? []
  const durationMins  = taskDurationMinutes(sub.quantity, subExtraWorks)

  // Keep an already-planned bar's length in step with the sub-task's time
  // (extra work added/removed) — driven by live data, so rapid toggles settle right.
  useEffect(() => {
    setDuration(sub._id, durationMins)
  }, [sub._id, durationMins, setDuration])

  const handleMerge = () =>
    mergeIntoParent({ sewingSubTaskId: sub._id as any }, { onSuccess: () => unassign(sub._id) })

  const handleToggleExtraWork = (work: ExtraWork) =>
    toggleExtraWork({ sewingSubTaskId: sub._id as any, extraWorkId: work._id })

  const handleAssign = (userId: string | undefined) => {
    updateAssignee({ sewingSubTaskId: sub._id as any, assignedTo: userId as any })
    if (userId) {
      assign({
        sewingSubTaskId: sub._id,
        sewerId:         userId,
        isScheduled:     false,
        startDate:       '',
        startMinute:     0,
        durationMinutes: durationMins,
        quantity:        sub.quantity,
        size:            sub.size ?? undefined,
        orderNumber:     taskMeta.orderNumber,
        specName:        taskMeta.specName,
        color:           taskMeta.color,
        status:          sub.status,
      })
    } else {
      unassign(sub._id)
    }
  }

  const isAssigned = sub.userName && sub.userName !== '—'
  const hasDay     = sub.startDate != null
  const splitQtyNum = parseInt(splitQty, 10)

  return (
    <div
      className={cn(
        'flex flex-col gap-1 border rounded-md px-2 py-1.5',
        // Planning state: fully planned (sewer + day) green, half-planned amber.
        isAssigned && hasDay
          ? 'border-emerald-300 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/20'
          : isAssigned || hasDay
            ? 'border-amber-300 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/20'
            : sub.isCustomSewing
              ? 'border-violet-300 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/20'
              : 'border-border bg-muted/30',
        // Custom keeps a violet edge whatever the planning state.
        sub.isCustomSewing && 'border-l-4 border-l-violet-400',
      )}
    >
      <div className="flex items-center gap-2 text-[13px]">
        <Checkbox checked={isSelected} onCheckedChange={onToggleSelect} className="bg-background" />
        {sub.isCustomSewing && (
          <span className="shrink-0 text-violet-500" title={sub.customSewingComment || 'Індивідуальний пошив'}>
            <Sparkles size={13} />
          </span>
        )}
        {sub.size && (
          <span className="shrink-0 text-[12px] font-semibold px-1.5 py-0.5 rounded bg-muted border border-border/60 leading-none">
            {sub.size}
          </span>
        )}
        <span className={cn('font-medium truncate flex-1', !isAssigned && 'text-muted-foreground italic')}>
          {isAssigned ? sub.userName : 'Не призначено'}
        </span>
        <span className="text-muted-foreground tabular-nums shrink-0">[{sub.quantity} шт]</span>
        <span className="text-muted-foreground tabular-nums shrink-0">{fmtDur(durationMins)}</span>
        <SubTaskDayPicker
          value={sub.startDate}
          onChange={(day) => setDay({ sewingSubTaskId: sub._id as any, day })}
        />
        <span className="flex items-center gap-1 shrink-0 text-[12px] text-muted-foreground">
          <span className={cn('size-2 rounded-full shrink-0', STATUS_DOT[sub.status])} />
          {STATUS_LABEL[sub.status] ?? sub.status}
        </span>
        <ActionsMenu
          items={[
            {
              label:    'Виконавець',
              icon:     <UserPlus size={12} />,
              subItems: sewerUsers.length > 0
                ? sewerUsers.map((user) => {
                    const isCurrent = sub.assignedTo === user._id
                    return {
                      label:     `${user.name} ${user.lastName}`.trim() || '—',
                      icon:      toggleItemIcon(isCurrent),
                      className: toggleItemClass(isCurrent),
                      onClick:   () => handleAssign(isCurrent ? undefined : user._id),
                    }
                  })
                : [{ label: 'Немає виконавців', icon: null, disabled: true }],
            },
            {
              label:    'Додаткова робота',
              icon:     <Plus size={12} />,
              subItems: extraWorks.length > 0
                ? extraWorks.map((work) => {
                    const isAdded = subExtraWorks.some((w) => w.workId === work._id)
                    return {
                      label:     work.name,
                      icon:      toggleItemIcon(isAdded),
                      className: toggleItemClass(isAdded),
                      keepOpen:  true,
                      onClick: () => handleToggleExtraWork(work),
                    }
                  })
                : [{ label: 'Довідник порожній', icon: null, disabled: true }],
            },
            {
              label:    'Розділити',
              icon:     <SplitSquareHorizontal size={12} />,
              disabled: sub.quantity <= 1,
              onClick:  () => onSplit(sub._id),
            },
            ...(canMerge ? [{
              label:       'Повернути',
              icon:        <Undo2 size={12} />,
              destructive: true,
              onClick:     handleMerge,
            }] : []),
          ]}
        />
      </div>

      {subExtraWorks.length > 0 && (
        <div className="flex flex-wrap gap-1 pl-0.5">
          {subExtraWorks.map((work) => (
            <span
              key={work.workId}
              className="px-1.5 py-0.5 rounded-full text-[11px] font-medium leading-none bg-violet-100 text-violet-700"
              title={`${work.minutesPerUnit} хв/шт`}
            >
              {work.name}
            </span>
          ))}
        </div>
      )}

      {splitId === sub._id && (
        <div className="flex items-center gap-1 pl-3">
          <input
            type="number"
            min={1}
            max={sub.quantity - 1}
            value={splitQty}
            onChange={(e) => onSplitQtyChange(e.target.value)}
            placeholder="К-сть"
            className="w-16 h-6 rounded border border-border bg-background px-1.5 text-[11px] outline-none"
            autoFocus
          />
          <Button type="button" size="sm" className="h-6 px-2 text-[11px]" onClick={onSplitConfirm}>
            ОК
          </Button>
          <Button type="button" variant="outline" size="sm" className="h-6 px-2 text-[11px]" onClick={onSplitCancel}>
            ✕
          </Button>
          {splitQtyNum > 0 && splitQtyNum < sub.quantity && (
            <span className="ml-1 text-[11px] text-muted-foreground tabular-nums">
              {`відділяємо ${splitQtyNum} шт · ${fmtDur(taskDurationMinutes(splitQtyNum, subExtraWorks))}, залишиться ${sub.quantity - splitQtyNum} шт · ${fmtDur(taskDurationMinutes(sub.quantity - splitQtyNum, subExtraWorks))}`}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ─── SewingTaskSubTasks ───────────────────────────────────────────────────────

// Dialog content is captured when the dialog opens, so it reads the task from
// the (shared, cached) query itself to stay live while assigning/splitting.
const SewingTaskSubTasks = ({ taskId }: { taskId: string }) => {
  const { data: tasks      = [] } = useQuery(convexQuery(api.queries.sewing.getSewingTasksWithCuttingProgress, {}))
  const { data: sewerUsers = [] } = useQuery(convexQuery(api.queries.sewing.getSewerUsers, {}))
  const { data: extraWorks = [] } = useQuery(convexQuery(api.queries.extraWorks.getExtraWorks, {}))
  const [splitState, setSplitState] = useState<{ id: string | null; qty: string }>({ id: null, qty: '' })
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const { mutate: splitMutation } = useSplitSewingSubTask()
  const { mutate: bulkAssign }    = useBulkAssignSewingSubTasks()
  const { mutate: bulkSetDay }    = useBulkSetSewingSubTaskDay()
  const { mutate: bulkExtraWork } = useBulkSetSewingSubTaskExtraWork()
  const { unassign }              = usePlannerStore.getState()

  const task = tasks.find((t) => t._id === taskId)
  if (!task) return <p className="text-[11px] text-muted-foreground">Завдання не знайдено</p>

  const taskMeta: TaskMeta = {
    orderNumber: String(task.orderIndex ?? task.keycrmOrderId ?? ''),
    specName:    task.specName ?? '',
    color:       task.fabricColorHex ?? '#6b7280',
  }

  // A part split off another sub-task (same rule as the merge mutation's fallback
  // for parts split before splitFromId was recorded) and not started yet.
  const canMerge = (sub: SubTaskRow) => {
    if (sub.status !== 'new' || (sub.completedQty ?? 0) > 0) return false
    if (sub.splitFromId) return true
    return task.subTasks.some((s) => s._id !== sub._id && s.productionOrderItemId === sub.productionOrderItemId && s._creationTime < sub._creationTime)
  }

  const handleSplitConfirm = () => {
    const sub = task.subTasks.find((s) => s._id === splitState.id)
    const qty = parseInt(splitState.qty, 10)
    if (!sub || !qty || qty <= 0 || qty >= sub.quantity) return
    splitMutation({ sewingSubTaskId: sub._id as any, splitQty: qty })
    unassign(sub._id)
    setSplitState({ id: null, qty: '' })
  }

  // Ids that still exist — split/merge can remove a selected sub-task.
  const selected      = task.subTasks.filter((s) => selectedIds.has(s._id)).map((s) => s._id as any)
  const allSelected   = task.subTasks.length > 0 && selected.length === task.subTasks.length
  const clearSelected = () => setSelectedIds(new Set())

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const handleBulkAssign = (userId: string | undefined) =>
    bulkAssign({ sewingSubTaskIds: selected, assignedTo: userId as any }, { onSuccess: clearSelected })

  // A work counts as "on" when every selected sub-task has it — then it's removed from all.
  const selectedSubs  = task.subTasks.filter((s) => selectedIds.has(s._id))
  const hasWorkOnAll  = (workId: string) =>
    selectedSubs.length > 0 && selectedSubs.every((s) => (s.extraWorks ?? []).some((w) => w.workId === workId))

  const handleBulkExtraWork = (work: ExtraWork) =>
    bulkExtraWork({ sewingSubTaskIds: selected, extraWorkId: work._id, add: !hasWorkOnAll(work._id) })

  const handleBulkDay = (day: number | null) =>
    bulkSetDay({ sewingSubTaskIds: selected, day }, { onSuccess: clearSelected })

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Вироби</p>

      {task.subTasks.length > 0 && (
        <div
          className={cn(
            'flex items-center gap-2 px-2 py-1.5 rounded-md bg-primary/5 border border-primary/20 transition-opacity',
            selected.length === 0 && 'opacity-60',
          )}
        >
          <label className="flex items-center gap-2 text-[12px] cursor-pointer select-none">
            <Checkbox
              checked={allSelected ? true : selected.length > 0 ? 'indeterminate' : false}
              onCheckedChange={() => setSelectedIds(allSelected ? new Set() : new Set(task.subTasks.map((s) => s._id)))}
              className="bg-background"
            />
            Вибрати все
          </label>
          <div className="ml-auto flex items-center gap-1.5">
            <ActionsMenu
              align="end"
              trigger={
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={selected.length === 0}
                  className="h-6 gap-1 px-2 text-[11px] border-primary/30 text-primary hover:bg-primary/10"
                >
                  <UserPlus size={11} />
                  {`Швачка (${selected.length})`}
                </Button>
              }
              items={[
                ...(sewerUsers.length > 0
                  ? sewerUsers.map((user) => ({
                      label:   `${user.name} ${user.lastName}`.trim() || '—',
                      icon:    <UserPlus size={12} />,
                      onClick: () => handleBulkAssign(user._id),
                    }))
                  : [{ label: 'Немає виконавців', icon: null, disabled: true }]),
                {
                  label:       'Зняти швачку',
                  icon:        <Undo2 size={12} />,
                  destructive: true,
                  onClick:     () => handleBulkAssign(undefined),
                },
              ]}
            />
            <SubTaskDayPicker
              value={null}
              onChange={handleBulkDay}
              trigger={
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={selected.length === 0}
                  className="h-6 gap-1 px-2 text-[11px] border-primary/30 text-primary hover:bg-primary/10"
                >
                  <CalendarDays size={11} />
                  {`Дата (${selected.length})`}
                </Button>
              }
            />
            <ActionsMenu
              align="end"
              trigger={
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={selected.length === 0}
                  className="h-6 gap-1 px-2 text-[11px] border-primary/30 text-primary hover:bg-primary/10"
                >
                  <Plus size={11} />
                  {`Робота (${selected.length})`}
                </Button>
              }
              items={extraWorks.length > 0
                ? extraWorks.map((work) => {
                    const isOn = hasWorkOnAll(work._id)
                    return {
                      label:     work.name,
                      icon:      toggleItemIcon(isOn),
                      className: toggleItemClass(isOn),
                      keepOpen:  true,
                      onClick:   () => handleBulkExtraWork(work),
                    }
                  })
                : [{ label: 'Довідник порожній', icon: null, disabled: true }]}
            />
          </div>
        </div>
      )}

      {task.subTasks.length === 0 && (
        <p className="text-[11px] text-muted-foreground">Немає виконавців</p>
      )}

      {task.subTasks.map((sub) => (
        <SubTaskItem
          key={sub._id}
          sub={sub}
          taskMeta={taskMeta}
          sewerUsers={sewerUsers}
          extraWorks={extraWorks}
          canMerge={canMerge(sub)}
          isSelected={selectedIds.has(sub._id)}
          onToggleSelect={() => toggleSelect(sub._id)}
          splitId={splitState.id}
          splitQty={splitState.qty}
          onSplit={(id) => setSplitState({ id, qty: '' })}
          onSplitQtyChange={(qty) => setSplitState((s) => ({ ...s, qty }))}
          onSplitConfirm={handleSplitConfirm}
          onSplitCancel={() => setSplitState({ id: null, qty: '' })}
        />
      ))}
    </div>
  )
}

// ─── SewingTaskDialog ─────────────────────────────────────────────────────────

type SewingTaskDialogProps = { taskId: string; productionOrderId: string; itemIds: string[] }

const SewingTaskDialog = ({ taskId, productionOrderId, itemIds }: SewingTaskDialogProps) => (
  <div className="flex gap-4 max-h-[75vh]">
    <ScrollArea className="w-88 shrink-0 border-r pr-1">
      <OrderInfoPanel productionOrderId={productionOrderId} itemIds={itemIds} />
    </ScrollArea>
    <ScrollArea className="flex-1 min-w-0">
      <SewingTaskSubTasks taskId={taskId} />
    </ScrollArea>
  </div>
)

// ─── SewingTaskCard ───────────────────────────────────────────────────────────

type CardProps = {
  task:       SewingTaskRow
  isSelected: boolean
  onSelect:   (id: string) => void
}

const SewingTaskCard = ({ task, isSelected, onSelect }: CardProps) => {
  const [logsOpen, setLogsOpen] = useState(false)

  const { mutate: updateTaskStatus } = useUpdateSewingTaskStatus()
  const { openDialog }               = useContext(DialogContext)

  const accent = task.fabricColorHex ?? '#6b7280'
  const { totalQty, completedQty, logs } = task.cuttingProgress
  const pct = totalQty > 0 ? Math.min(100, Math.round((completedQty / totalQty) * 100)) : 0

  const customSubTasks  = task.subTasks.filter((s) => s.isCustomSewing)
  const hasCustomSewing = customSubTasks.length > 0
  const isCustom        = hasCustomSewing || task.subTasks.some((s) => s.isCustomCut)
  const brandingTypes   = BRANDING_TYPES.filter((t) => task.brandingTypes.includes(t))

  const handleOpenSubTasks = () => {
    openDialog({
      title: (
        <span className="flex items-center gap-1.5">
          {isCustom && <Sparkles size={16} className="text-violet-500 shrink-0" />}
          {`Замовлення #${task.orderIndex ?? task.keycrmOrderId} · ${task.specName ?? ''}`}
        </span>
      ),
      className: cn('sm:w-240 sm:max-w-240', isCustom && 'border-2 border-violet-400'),
      content: (
        <SewingTaskDialog
          taskId={task._id}
          productionOrderId={task.productionOrderId}
          itemIds={task.subTasks.flatMap((s) => (s.productionOrderItemId ? [s.productionOrderItemId] : []))}
        />
      ),
    })
  }

  const canToggleStatus = TOGGLABLE_STATUSES.has(task.status)
  const handleToggleStatus = () => {
    if (!canToggleStatus) return
    updateTaskStatus({
      sewingTaskId: task._id as any,
      status: task.status === 'new' ? 'distributed' : 'new',
    })
  }

  return (
    <div
      className={cn(
        'rounded-lg border transition-colors overflow-hidden',
        isCustom && 'border-2',
        isSelected ? 'border-primary' : isCustom ? 'border-violet-400' : 'border-border',
      )}
    >
      {/* Header — always visible */}
      <div
        className={cn('flex overflow-hidden', isSelected ? 'bg-primary/5' : 'bg-card hover:bg-muted/40')}
        onClick={() => onSelect(task._id)}
      >
        <div className="w-0.75 shrink-0" style={{ backgroundColor: accent }} />

        <div className="flex flex-col gap-1 px-2.5 py-2 min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-2 min-w-0">
              {hasCustomSewing && (
                <span
                  className="shrink-0 text-violet-500"
                  title={customSubTasks.map((s) => s.customSewingComment).filter(Boolean).join('; ') || 'Індивідуальний пошив'}
                >
                  <Sparkles size={12} />
                </span>
              )}
              <span className="text-[10px] font-bold shrink-0">#{task.orderIndex}</span>
              <p className="text-[12px] font-medium leading-tight truncate">{task.specName}</p>
            </div>
            <span className={cn('text-[11px] shrink-0 tabular-nums', endDateColor(task.endDate))}>{formatDate(task.endDate)}</span>
          </div>

          <div className="flex items-center gap-1.5">
            {task.colorName && (
              <span
                className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none"
                style={{ backgroundColor: accent, color: task.labelColorHex ?? '#ffffff' }}
              >
                {task.colorName}
              </span>
            )}
            {canToggleStatus ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                key={task.status}
                className="h-auto p-0 gap-1 text-[10px] text-muted-foreground hover:bg-transparent hover:text-foreground"
                title="Змінити статус"
                onClick={(e) => { e.stopPropagation(); handleToggleStatus() }}
              >
                <span className={cn('size-1.5 rounded-full shrink-0', STATUS_DOT[task.status])} />
                {STATUS_LABEL[task.status]}
              </Button>
            ) : (
              <>
                <span className={cn('size-1.5 rounded-full shrink-0', STATUS_DOT[task.status])} />
                <span className="text-[10px] text-muted-foreground">{STATUS_LABEL[task.status]}</span>
              </>
            )}
            <span className="text-[10px] text-muted-foreground ml-auto">{task.totalQuantity} шт</span>
          </div>

          <div className="flex flex-col gap-0.5 mt-0.5">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Розкрій</span>
              <span className="tabular-nums">{completedQty}/{totalQty} шт</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              className="w-full h-auto p-0 justify-start hover:bg-transparent"
              onClick={(e) => { e.stopPropagation(); setLogsOpen((v) => !v) }}
              title="Переглянути записи розкрою"
            >
              <ProgressBar done={completedQty} total={totalQty} size="md" hex={accent} />
            </Button>
          </div>

          {brandingTypes.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-0.5">
              {brandingTypes.map((type) => (
                <span key={type} className="px-1.5 py-0.5 rounded-full text-[10px] font-medium leading-none bg-primary/10 text-primary">
                  {BRANDING_LABELS[type]}
                </span>
              ))}
            </div>
          )}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="shrink-0 self-center mr-1 cursor-pointer"
          title="Пошив"
          onClick={(e) => { e.stopPropagation(); handleOpenSubTasks() }}
        >
          <ChevronRight size={14} />
        </Button>
      </div>

      {logsOpen && (
        <div className="px-3 py-2 border-t border-border/60 bg-muted/5">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
            Записи розкрою
          </p>
          <CuttingLogsPanel logs={logs} />
        </div>
      )}
    </div>
  )
}

// ─── OrdersList ───────────────────────────────────────────────────────────────

type Props = {
  selectedId: string | null
  onSelect:   (id: string) => void
}

export const OrdersList = ({ selectedId, onSelect }: Props) => {
  const [day, setDay]               = useState<number | null>(null)
  // No day → the full list; a day → only tasks with something planned on it (server-side).
  const { data: tasks      = [] } = useQuery({
    ...convexQuery(api.queries.sewing.getSewingTasksWithCuttingProgress, day != null ? { day } : {}),
    placeholderData: keepPreviousData,
  })
  const [search, setSearch]         = useState('')
  const [statusFilter, setStatusFilter] = useState<string[]>(['new'])

  const toggleStatusFilter = (status: string) =>
    setStatusFilter((prev) => prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status])

  const filtered = tasks
    .filter((t) => !search.trim() || t.keycrmOrderId.includes(search) || t.specName?.toLowerCase().includes(search.toLowerCase()))
    .filter((t) => statusFilter.length === 0 || statusFilter.includes(t.status))

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-3 py-2 border-b shrink-0 flex items-center" style={{ minHeight: 41 }}>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Замовлення</p>
      </div>

      <div className="px-1.5 py-1.5 border-b shrink-0 flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2 h-7">
          <Search size={12} className="text-muted-foreground shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Пошук..."
            className="flex-1 min-w-0 bg-transparent text-xs outline-none placeholder:text-muted-foreground/60"
          />
          <SubTaskDayPicker
            value={day}
            onChange={setDay}
            trigger={
              <Button
                type="button"
                variant="ghost"
                size="sm"
                title="Фільтр за днем пошиву"
                className={cn(
                  'h-5 -mr-1 shrink-0 gap-1 px-1.5 text-[11px] tabular-nums',
                  day != null ? 'bg-primary/10 text-primary font-medium hover:bg-primary/15 hover:text-primary' : 'text-muted-foreground',
                )}
              >
                <CalendarDays className="size-3" />
                {day != null && format(new UTCDate(day), 'dd.MM')}
              </Button>
            }
          />
        </div>

        <div className="flex items-center gap-1 flex-wrap">
          {STATUS_FILTER_OPTIONS.map((status) => {
            const active = statusFilter.includes(status)
            return (
              <Button
                key={status}
                type="button"
                variant="outline"
                onClick={() => toggleStatusFilter(status)}
                className={cn(
                  'h-auto gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-normal',
                  active
                    ? 'border-primary/60 bg-primary/10 text-foreground'
                    : 'text-muted-foreground hover:border-foreground/30 hover:text-foreground',
                )}
              >
                <span className={cn('size-1.5 rounded-full shrink-0', STATUS_DOT[status])} />
                {STATUS_LABEL[status]}
              </Button>
            )
          })}
          {statusFilter.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStatusFilter([])}
              className="h-auto text-[10px] px-1.5 py-0.5 text-muted-foreground hover:text-foreground font-normal"
            >
              Скинути
            </Button>
          )}
        </div>
      </div>
      <ScrollArea className="max-h-200">
        <div className="flex-1 overflow-y-auto flex flex-col gap-1 p-1.5">
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground text-center mt-4">Немає завдань</p>
          )}
          {filtered.map((task) => (
            <SewingTaskCard
              key={task._id}
              task={task}
              isSelected={selectedId === task._id}
              onSelect={onSelect}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
