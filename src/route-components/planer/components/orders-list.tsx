import { useState } from 'react'
import { UTCDate } from '@date-fns/utc'
import { ProgressBar } from '@/components/progress-bar'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from 'convex/_generated/api'
import { type FunctionReturnType } from 'convex/server'
import { Search, ChevronDown, ChevronRight, SplitSquareHorizontal, UserPlus, Check, X, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MyPopover } from '@/components/my-popover'
import { usePlannerStore } from '../store'
import { useUpdateSewingSubTaskAssignee, useSplitSewingSubTask, useUpdateSewingTaskStatus } from '../queries'
import { OrderNumberLink } from './order-number-link'

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

const durationMinutesFor = (qty: number) => Math.max(20, qty * 3)

const calcDuration = (qty: number) => {
  const mins = durationMinutesFor(qty)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}г${m > 0 ? ` ${m}хв` : ''}` : `${m}хв`
}

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

// ─── SubTaskItem ─────────────────────────────────────────────────────────────

type TaskMeta = { orderNumber: string; specName: string; color: string }

type SewerUser = { _id: string; name: string; lastName: string }

type SubTaskProps = {
  sub:              SubTaskRow
  taskMeta:         TaskMeta
  sewerUsers:       SewerUser[]
  splitId:          string | null
  splitQty:         string
  onSplit:          (id: string) => void
  onSplitQtyChange: (v: string) => void
  onSplitConfirm:   () => void
  onSplitCancel:    () => void
}

const SubTaskItem = ({
  sub, taskMeta, sewerUsers, splitId, splitQty,
  onSplit, onSplitQtyChange, onSplitConfirm, onSplitCancel,
}: SubTaskProps) => {
  const { mutate: updateAssignee } = useUpdateSewingSubTaskAssignee()
  const { assign, unassign }       = usePlannerStore.getState()

  const handleAssign = (userId: string | undefined) => {
    updateAssignee({ sewingSubTaskId: sub._id as any, assignedTo: userId as any })
    if (userId) {
      assign({
        sewingSubTaskId: sub._id,
        sewerId:         userId,
        isScheduled:     false,
        startDate:       '',
        startMinute:     0,
        durationMinutes: durationMinutesFor(sub.quantity),
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

  return (
    <div
      className={cn(
        'flex flex-col gap-1',
        sub.isCustomSewing && 'border border-violet-300 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/20 rounded-md px-1.5 py-1 -mx-1.5',
      )}
    >
      <div className="flex items-center gap-1.5 text-[11px]">
        <span className={cn('size-1.5 rounded-full shrink-0', STATUS_DOT[sub.status])} />
        {sub.isCustomSewing && (
          <span className="shrink-0 text-violet-500" title={sub.customSewingComment || 'Індивідуальний пошив'}>
            <Sparkles size={11} />
          </span>
        )}
        {sub.size && (
          <span className="shrink-0 text-[10px] font-semibold px-1 py-0.5 rounded bg-muted border border-border/60 leading-none">
            {sub.size}
          </span>
        )}
        <span className={cn('font-medium truncate flex-1', !isAssigned && 'text-muted-foreground italic')}>
          {isAssigned ? sub.userName : 'Не призначено'}
        </span>
        <span className="text-muted-foreground tabular-nums shrink-0">[{sub.quantity} шт]</span>
        <span className="text-muted-foreground tabular-nums shrink-0">{calcDuration(sub.quantity)}</span>

        <MyPopover
          align="end"
          trigger={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="size-5 shrink-0 text-muted-foreground"
              title="Призначити виконавця"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <UserPlus size={11} />
            </Button>
          }
          content={
            <div className="flex flex-col min-w-[160px]">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-1 pb-1">
                Виконавець
              </p>
              {sewerUsers.map((user) => {
                const fullName  = `${user.name} ${user.lastName}`.trim()
                const isCurrent = sub.assignedTo === user._id
                return (
                  <Button
                    key={user._id}
                    type="button"
                    variant="ghost"
                    onClick={() => handleAssign(isCurrent ? undefined : user._id)}
                    className="h-auto justify-start gap-2 px-1 py-1.5 rounded text-[11px] font-normal text-left"
                  >
                    <span className="size-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold shrink-0">
                      {user.name[0]}{user.lastName[0]}
                    </span>
                    <span className="flex-1 truncate">{fullName || '—'}</span>
                    {isCurrent && <Check size={11} className="shrink-0 text-primary" />}
                  </Button>
                )
              })}
              {sewerUsers.length === 0 && (
                <p className="text-[11px] text-muted-foreground px-1 py-1.5">Немає виконавців</p>
              )}
              {isAssigned && (
                <>
                  <div className="border-t border-border/40 my-0.5" />
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => handleAssign(undefined)}
                    className="h-auto justify-start gap-2 px-1 py-1.5 rounded text-[11px] font-normal text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X size={11} />
                    Зняти призначення
                  </Button>
                </>
              )}
            </div>
          }
        />

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-5 shrink-0 text-muted-foreground"
          title="Розділити"
          onClick={() => onSplit(sub._id)}
        >
          <SplitSquareHorizontal size={11} />
        </Button>
      </div>

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
        </div>
      )}
    </div>
  )
}

// ─── SewingTaskCard ───────────────────────────────────────────────────────────

type CardProps = {
  task:           SewingTaskRow
  isSelected:     boolean
  isExpanded:     boolean
  sewerUsers:     SewerUser[]
  onSelect:       (id: string) => void
  onToggleExpand: (id: string) => void
}

const SewingTaskCard = ({ task, isSelected, isExpanded, sewerUsers, onSelect, onToggleExpand }: CardProps) => {
  const [logsOpen, setLogsOpen]     = useState(false)
  const [splitState, setSplitState] = useState<{ id: string | null; qty: string }>({ id: null, qty: '' })

  const { mutate: splitMutation }       = useSplitSewingSubTask()
  const { mutate: updateTaskStatus }    = useUpdateSewingTaskStatus()
  const { unassign }                    = usePlannerStore.getState()

  const accent = task.fabricColorHex ?? '#6b7280'
  const { totalQty, completedQty, logs } = task.cuttingProgress
  const pct = totalQty > 0 ? Math.min(100, Math.round((completedQty / totalQty) * 100)) : 0

  const customSubTasks  = task.subTasks.filter((s) => s.isCustomSewing)
  const hasCustomSewing = customSubTasks.length > 0

  const taskMeta: TaskMeta = {
    orderNumber: String(task.orderIndex ?? task.keycrmOrderId ?? ''),
    specName:    task.specName ?? '',
    color:       accent,
  }

  const handleSplitConfirm = () => {
    const sub = task.subTasks.find((s) => s._id === splitState.id)
    const qty = parseInt(splitState.qty, 10)
    if (!sub || !qty || qty <= 0 || qty >= sub.quantity) return
    splitMutation({ sewingSubTaskId: sub._id as any, splitQty: qty })
    unassign(sub._id)
    setSplitState({ id: null, qty: '' })
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
    <div className={cn('rounded-lg border transition-colors overflow-hidden', isSelected ? 'border-primary' : 'border-border')}>
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
              <OrderNumberLink productionOrderId={task.productionOrderId} orderIndex={task.orderIndex} />
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
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="shrink-0 self-center mr-1 cursor-pointer"
          onClick={(e) => { e.stopPropagation(); onToggleExpand(task._id) }}
        >
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
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

      {isExpanded && (
        <div className="flex flex-col gap-2 px-3 py-2 border-t border-border/60 bg-muted/10">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Пошив</p>

          {task.subTasks.length === 0 && (
            <p className="text-[11px] text-muted-foreground">Немає виконавців</p>
          )}

          {task.subTasks.map((sub) => (
            <SubTaskItem
              key={sub._id}
              sub={sub}
              taskMeta={taskMeta}
              sewerUsers={sewerUsers}
              splitId={splitState.id}
              splitQty={splitState.qty}
              onSplit={(id) => setSplitState({ id, qty: '' })}
              onSplitQtyChange={(qty) => setSplitState((s) => ({ ...s, qty }))}
              onSplitConfirm={handleSplitConfirm}
              onSplitCancel={() => setSplitState({ id: null, qty: '' })}
            />
          ))}
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
  const { data: tasks      = [] } = useQuery(convexQuery(api.queries.sewing.getSewingTasksWithCuttingProgress, {}))
  const { data: sewerUsers = [] } = useQuery(convexQuery(api.queries.sewing.getSewerUsers, {}))
  const [search, setSearch]         = useState('')
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const toggleStatusFilter = (status: string) =>
    setStatusFilter((prev) => prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status])

  const filtered = tasks
    .filter((t) => !search.trim() || t.keycrmOrderId.includes(search) || t.specName?.toLowerCase().includes(search.toLowerCase()))
    .filter((t) => statusFilter.length === 0 || statusFilter.includes(t.status))

  const toggleExpand = (id: string) => setExpandedId((prev) => (prev === id ? null : id))

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
              isExpanded={expandedId === task._id}
              sewerUsers={sewerUsers}
              onSelect={onSelect}
              onToggleExpand={toggleExpand}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
