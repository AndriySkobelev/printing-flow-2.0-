import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { convexQuery, useConvexMutation } from '@convex-dev/react-query'
import { api } from 'convex/_generated/api'
import { type FunctionReturnType } from 'convex/server'
import { Search, ChevronDown, ChevronRight, SplitSquareHorizontal, UserPlus, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MyPopover } from '@/components/my-popover'
import { usePlannerStore } from '../store'

// ─── Types ───────────────────────────────────────────────────────────────────

type SewingTaskRow = NonNullable<FunctionReturnType<typeof api.queries.sewing.getSewingTasksWithCuttingProgress>>[number]
type SubTaskRow    = SewingTaskRow['subTasks'][number]
type CuttingLog    = SewingTaskRow['cuttingProgress']['logs'][number]

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_DOT: Record<string, string> = {
  new:         'bg-blue-400',
  in_progress: 'bg-amber-400',
  done:        'bg-green-500',
  delayed:     'bg-red-400',
  paused:      'bg-gray-400',
}

const STATUS_LABEL: Record<string, string> = {
  new:         'Новий',
  in_progress: 'В роботі',
  done:        'Готово',
  delayed:     'Затримка',
  paused:      'Пауза',
}

const formatDate = (ts?: number | null) =>
  ts ? new Date(ts).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' }) : '—'

const formatTime = (ts: number) =>
  new Date(ts).toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

const calcDuration = (qty: number) => {
  const mins = Math.max(20, qty * 3)
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
  const updateAssignee          = useConvexMutation(api.queries.sewing.updateSewingSubTaskAssignee)
  const { assign, unassign }    = usePlannerStore.getState()

  const handleAssign = (userId: string | undefined) => {
    updateAssignee({ sewingSubTaskId: sub._id as any, assignedTo: userId as any })
    if (userId) {
      assign({
        sewingSubTaskId: sub._id,
        sewerId:         userId,
        isScheduled:     false,
        startDate:       '',
        startMinute:     0,
        durationMinutes: Math.max(20, sub.quantity * 3),
        quantity:        sub.quantity,
        size:            sub.size ?? undefined,
        orderNumber:     taskMeta.orderNumber,
        specName:        taskMeta.specName,
        color:           taskMeta.color,
      })
    } else {
      unassign(sub._id)
    }
  }

  const isAssigned = sub.userName && sub.userName !== '—'

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-[11px]">
        <span className={cn('size-1.5 rounded-full shrink-0', STATUS_DOT[sub.status])} />
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
                  <button
                    key={user._id}
                    type="button"
                    onClick={() => handleAssign(isCurrent ? undefined : user._id)}
                    className="flex items-center gap-2 px-1 py-1.5 rounded text-[11px] hover:bg-muted/60 transition-colors text-left"
                  >
                    <span className="size-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold shrink-0">
                      {user.name[0]}{user.lastName[0]}
                    </span>
                    <span className="flex-1 truncate">{fullName || '—'}</span>
                    {isCurrent && <Check size={11} className="shrink-0 text-primary" />}
                  </button>
                )
              })}
              {sewerUsers.length === 0 && (
                <p className="text-[11px] text-muted-foreground px-1 py-1.5">Немає виконавців</p>
              )}
              {isAssigned && (
                <>
                  <div className="border-t border-border/40 my-0.5" />
                  <button
                    type="button"
                    onClick={() => handleAssign(undefined)}
                    className="flex items-center gap-2 px-1 py-1.5 rounded text-[11px] text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <X size={11} />
                    Зняти призначення
                  </button>
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

  const splitMutation = useConvexMutation(api.queries.sewing.splitSewingSubTask)
  const { unassign }  = usePlannerStore.getState()

  const accent = task.fabricColorHex ?? '#6b7280'
  const { totalQty, completedQty, logs } = task.cuttingProgress
  const pct = totalQty > 0 ? Math.min(100, Math.round((completedQty / totalQty) * 100)) : 0

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

  return (
    <div className={cn('rounded-lg border transition-colors overflow-hidden', isSelected ? 'border-primary' : 'border-border')}>
      {/* Header — always visible */}
      <div
        className={cn('flex overflow-hidden cursor-pointer', isSelected ? 'bg-primary/5' : 'bg-card hover:bg-muted/40')}
        onClick={() => onSelect(task._id)}
      >
        <div className="w-0.75 shrink-0" style={{ backgroundColor: accent }} />

        <div className="flex flex-col gap-1 px-2.5 py-2 min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[10px] font-bold shrink-0">#{task.orderIndex}</span>
              <p className="text-[12px] font-medium leading-tight truncate">{task.specName}</p>
            </div>
            <span className="text-[11px] text-muted-foreground shrink-0 tabular-nums">{formatDate(task.endDate)}</span>
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
            <span className={cn('size-1.5 rounded-full shrink-0', STATUS_DOT[task.status])} />
            <span className="text-[10px] text-muted-foreground">{STATUS_LABEL[task.status]}</span>
            <span className="text-[10px] text-muted-foreground ml-auto">{task.totalQuantity} шт</span>
          </div>

          <div className="flex flex-col gap-0.5 mt-0.5">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Розкрій</span>
              <span className="tabular-nums">{completedQty}/{totalQty} шт</span>
            </div>
            <button
              type="button"
              className="w-full h-2 rounded-full bg-border overflow-hidden cursor-pointer"
              onClick={(e) => { e.stopPropagation(); setLogsOpen((v) => !v) }}
              title="Переглянути записи розкрою"
            >
              <div
                className="h-full rounded-full transition-all hover:brightness-110"
                style={{ width: `${pct}%`, backgroundColor: accent }}
              />
            </button>
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="shrink-0 self-center mr-1"
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
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filtered = search.trim()
    ? tasks.filter((t) =>
        t.keycrmOrderId.includes(search) ||
        t.specName?.toLowerCase().includes(search.toLowerCase())
      )
    : tasks

  const toggleExpand = (id: string) => setExpandedId((prev) => (prev === id ? null : id))

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-3 py-2 border-b shrink-0 flex items-center" style={{ minHeight: 41 }}>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Замовлення</p>
      </div>

      <div className="px-1.5 py-1.5 border-b shrink-0">
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
