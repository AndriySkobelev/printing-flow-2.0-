import { useState, useRef, useEffect } from 'react'
import { type Doc } from 'convex/_generated/dataModel'
import {
  DndContext,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useAppForm } from '@/components/main-form'
import { cn } from '@/lib/utils'
import { DAY_START, DAY_END, DAY_MINS, HOUR_PX, MIN_PX, SEWERS, SEWER_OPTIONS, DAY_NAMES } from '../constants'
import { snap15, toDateStr, addDays, getMondayOf, fmtTime, fmtDur } from '../helpers'
import { usePlannerEvents, useCreateEvent, useUpdateEvent, useDeleteEvent } from '../queries'

// ─── Types ────────────────────────────────────────────────────────────────────

type PlannerEvent = Doc<'plannerEvents'>

export type PlannerOrder = {
  id: string
  number: string
  duration: number // minutes
}

// ─── Event Form Dialog ────────────────────────────────────────────────────────

type FormValues = {
  orderId: string
  sewerId: string
  date: string
  startH: string
  startM: string
}

type EventFormDialogProps = {
  open: boolean
  onClose: () => void
  orders: PlannerOrder[]
  prefillSewer?: string
  prefillDate?: string
  prefillH?: number
  prefillM?: number
  editEvent?: PlannerEvent
}

function EventFormDialog({
  open, onClose, orders, prefillSewer, prefillDate, prefillH, prefillM, editEvent,
}: EventFormDialogProps) {
  const { mutate: create } = useCreateEvent()
  const { mutate: update } = useUpdateEvent()

  const orderOptions = orders.map(o => ({ value: o.id, label: `#${o.number}` }))

  const form = useAppForm({
    defaultValues: {
      orderId: editEvent?.orderId  ?? '',
      sewerId: editEvent?.sewerId  ?? prefillSewer ?? SEWERS[0].id,
      date:    editEvent?.date     ?? prefillDate  ?? toDateStr(new Date()),
      startH:  editEvent ? String(editEvent.startH) : String(prefillH ?? DAY_START),
      startM:  editEvent ? String(editEvent.startM) : String(prefillM ?? 0),
    } as FormValues,
    onSubmit: ({ value }) => {
      const order = orders.find(o => o.id === value.orderId)
      if (!order) return
      const startH = Number(value.startH)
      const startM = snap15(Number(value.startM))
      if (editEvent) {
        update({ id: editEvent._id, sewerId: value.sewerId, date: value.date, startH, startM }, { onSuccess: onClose })
      } else {
        create(
          { orderId: order.id, orderNumber: order.number, sewerId: value.sewerId, date: value.date, startH, startM, duration: order.duration },
          { onSuccess: onClose },
        )
      }
    },
  })

  useEffect(() => { if (open) form.reset() }, [open])

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{editEvent ? 'Редагувати подію' : 'Запланувати замовлення'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={e => { e.preventDefault(); form.handleSubmit() }} className="flex flex-col gap-3">
          {!editEvent && (
            <form.AppField name="orderId" children={f => <f.FormSelect label="Замовлення" options={orderOptions} />} />
          )}
          <form.AppField name="sewerId" children={f => <f.FormSelect label="Швея" options={SEWER_OPTIONS} />} />
          <form.AppField name="date" children={f => <f.FormTextField label="Дата" type="text" placeholder="рррр-мм-дд" />} />
          <div className="flex gap-2">
            <form.AppField name="startH" children={f => <f.FormTextField label="Година" type="number" />} />
            <form.AppField name="startM" children={f => <f.FormTextField label="Хвилини" type="number" />} />
          </div>
          <DialogFooter className="pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Скасувати</Button>
            <Button type="submit">Зберегти</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Draggable Event Block ────────────────────────────────────────────────────

function EventBlock({ event, sewer, onEdit }: {
  event: PlannerEvent
  sewer: typeof SEWERS[number]
  onEdit: (ev: PlannerEvent) => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: event._id,
    data: { event },
  })

  const x = ((event.startH - DAY_START) * 60 + event.startM) * MIN_PX
  const w = Math.max(event.duration * MIN_PX, 44)

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={e => { e.stopPropagation(); onEdit(event) }}
      className={cn(
        'absolute top-1 bottom-1 rounded-md px-2 py-1 cursor-grab active:cursor-grabbing select-none overflow-hidden flex flex-col justify-center shadow-sm border transition-opacity',
        isDragging && 'opacity-50',
      )}
      style={{
        left: x,
        width: w,
        background: sewer.bg,
        borderColor: sewer.color,
        transform: transform ? `translate3d(${transform.x}px,${transform.y}px,0)` : undefined,
        zIndex: isDragging ? 50 : 1,
      }}
    >
      <div className="text-[11px] font-semibold truncate" style={{ color: sewer.color }}>
        #{event.orderNumber}
      </div>
      <div className="text-[10px] text-muted-foreground">
        {fmtTime(event.startH, event.startM)} · {fmtDur(event.duration)}
      </div>
    </div>
  )
}

// ─── Droppable Sewer Row ──────────────────────────────────────────────────────

function SewerRow({ sewer, events, date, onSlotClick, onEdit }: {
  sewer: typeof SEWERS[number]
  events: PlannerEvent[]
  date: string
  onSlotClick: (sewerId: string, h: number, m: number) => void
  onEdit: (ev: PlannerEvent) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: sewer.id })
  const rowRef = useRef<HTMLDivElement>(null)

  const totalMins = events.reduce((s, e) => s + e.duration, 0)
  const load = totalMins / DAY_MINS
  const hours = Array.from({ length: DAY_END - DAY_START + 1 }, (_, i) => DAY_START + i)

  const now = new Date()
  const nowMins = now.getHours() * 60 + now.getMinutes() - DAY_START * 60
  const showNow = toDateStr(now) === date && nowMins >= 0 && nowMins <= DAY_MINS

  function handleRowClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!rowRef.current) return
    const rect = rowRef.current.getBoundingClientRect()
    const snapped = snap15(Math.max(0, Math.min((e.clientX - rect.left) / MIN_PX, DAY_MINS - 1)))
    onSlotClick(sewer.id, DAY_START + Math.floor(snapped / 60), snapped % 60)
  }

  return (
    <div className="flex items-stretch min-h-[64px]">
      <div className="w-[180px] shrink-0 flex flex-col justify-center px-3 py-2 bg-muted/30 border-r gap-1">
        <div className="flex items-center gap-2">
          <span
            className="size-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ background: sewer.color }}
          >
            {sewer.name[0]}
          </span>
          <span className="text-sm font-medium truncate">{sewer.name}</span>
        </div>
        <div className="text-[11px] text-muted-foreground">{fmtDur(totalMins)}</div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={cn('h-full rounded-full', load > 1 ? 'bg-red-500' : 'bg-emerald-500')}
            style={{ width: `${Math.min(load * 100, 100)}%` }}
          />
        </div>
      </div>

      <div
        ref={node => { setNodeRef(node); (rowRef as any).current = node }}
        className={cn('relative flex-1 border-b cursor-pointer transition-colors', isOver && 'bg-primary/5')}
        style={{ width: DAY_MINS * MIN_PX, minWidth: DAY_MINS * MIN_PX }}
        onClick={handleRowClick}
      >
        {hours.map(h => (
          <div
            key={h}
            className="absolute top-0 bottom-0 border-l border-dashed border-border/40"
            style={{ left: (h - DAY_START) * HOUR_PX }}
          />
        ))}
        {events.map(ev => (
          <EventBlock key={ev._id} event={ev} sewer={sewer} onEdit={onEdit} />
        ))}
        {showNow && (
          <div
            className="absolute top-0 bottom-0 w-px bg-red-500 z-20 pointer-events-none"
            style={{ left: nowMins * MIN_PX }}
          />
        )}
      </div>
    </div>
  )
}

// ─── Day View ─────────────────────────────────────────────────────────────────

function DayView({ date, events, onSlotClick, onEdit, onDrop }: {
  date: string
  events: PlannerEvent[]
  onSlotClick: (sewerId: string, h: number, m: number) => void
  onEdit: (ev: PlannerEvent) => void
  onDrop: (event: PlannerEvent, newSewerId: string, newH: number, newM: number) => void
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  const dayEvents = events.filter(e => e.date === date)
  const hours = Array.from({ length: DAY_END - DAY_START + 1 }, (_, i) => DAY_START + i)

  function handleDragEnd(e: DragEndEvent) {
    const ev = e.active.data.current?.event as PlannerEvent | undefined
    if (!ev || !e.over) return
    const activeRect = e.active.rect.current.translated
    const overRect = e.over.rect
    if (!activeRect || !overRect) return
    const snapped = snap15(Math.max(0, Math.min((activeRect.left - overRect.left) / MIN_PX, DAY_MINS - 1)))
    onDrop(ev, e.over.id as string, DAY_START + Math.floor(snapped / 60), snapped % 60)
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex flex-col overflow-x-auto">
        <div className="flex" style={{ paddingLeft: 180 }}>
          <div className="relative" style={{ width: DAY_MINS * MIN_PX, height: 24, flexShrink: 0 }}>
            {hours.map(h => (
              <div
                key={h}
                className="absolute text-[11px] text-muted-foreground"
                style={{ left: (h - DAY_START) * HOUR_PX - 12 }}
              >
                {String(h).padStart(2, '0')}:00
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-px mt-1">
          {SEWERS.map(sewer => (
            <SewerRow
              date={date}
              sewer={sewer}
              key={sewer.id}
              onEdit={onEdit}
              onSlotClick={onSlotClick}
              events={dayEvents.filter(e => e.sewerId === sewer.id)}
            />
          ))}
        </div>
      </div>
    </DndContext>
  )
}

// ─── Week View ────────────────────────────────────────────────────────────────

function WeekView({ monday, events, onCellClick, onEdit }: {
  monday: Date
  events: PlannerEvent[]
  onCellClick: (sewerId: string, date: string) => void
  onEdit: (ev: PlannerEvent) => void
}) {
  const days = Array.from({ length: 5 }, (_, i) => addDays(monday, i))

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="w-[140px] border border-border bg-muted/30 p-2 text-left text-xs font-medium text-muted-foreground">
              Швея
            </th>
            {days.map((d, i) => (
              <th
                key={i}
                className={cn(
                  'border border-border bg-muted/30 p-2 text-center text-xs font-medium min-w-[140px]',
                  toDateStr(d) === toDateStr(new Date()) && 'bg-primary/5 text-primary',
                )}
              >
                {DAY_NAMES[i]}<br />
                <span className="font-normal">{d.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' })}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SEWERS.map(sewer => (
            <tr key={sewer.id}>
              <td className="border border-border p-2 bg-muted/10">
                <div className="flex items-center gap-2">
                  <span
                    className="size-6 rounded-full flex items-center justify-center text-white text-[11px] font-bold"
                    style={{ background: sewer.color }}
                  >
                    {sewer.name[0]}
                  </span>
                  <span className="text-sm font-medium">{sewer.name}</span>
                </div>
              </td>
              {days.map((d, di) => {
                const dateStr = toDateStr(d)
                const dayEvs = events.filter(e => e.date === dateStr && e.sewerId === sewer.id)
                return (
                  <td
                    key={di}
                    className="border border-border p-1 align-top cursor-pointer hover:bg-muted/20 transition-colors"
                    style={{ minHeight: 80 }}
                    onClick={() => onCellClick(sewer.id, dateStr)}
                  >
                    <div className="flex flex-col gap-1">
                      {dayEvs.map(ev => (
                        <div
                          key={ev._id}
                          onClick={e => { e.stopPropagation(); onEdit(ev) }}
                          className="rounded px-2 py-1 text-[11px] cursor-pointer hover:opacity-80 border"
                          style={{ background: sewer.bg, borderColor: sewer.color }}
                        >
                          <div className="font-semibold" style={{ color: sewer.color }}>#{ev.orderNumber}</div>
                          <div className="text-muted-foreground">{fmtTime(ev.startH, ev.startM)} · {fmtDur(ev.duration)}</div>
                        </div>
                      ))}
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

type Props = { orders: PlannerOrder[] }

export default function ProductionPlanner({ orders }: Props) {
  const [view, setView] = useState<'day' | 'week'>('day')
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editEvent, setEditEvent] = useState<PlannerEvent | undefined>()
  const [prefill, setPrefill] = useState<{ sewerId?: string; date?: string; h?: number; m?: number }>({})
  const [deleteConfirm, setDeleteConfirm] = useState<PlannerEvent | undefined>()

  const monday  = getMondayOf(currentDate)
  const dateStr = toDateStr(currentDate)

  const from = toDateStr(addDays(monday, -7))
  const to   = toDateStr(addDays(monday, 14))
  const { data: events = [] } = usePlannerEvents(from, to)

  const { mutate: updateEvent } = useUpdateEvent()
  const { mutate: deleteEvent } = useDeleteEvent()

  function navigate(dir: 1 | -1) {
    setCurrentDate(d => addDays(d, view === 'day' ? dir : dir * 7))
  }

  function openNew(sewerId?: string, date?: string, h?: number, m?: number) {
    setEditEvent(undefined)
    setPrefill({ sewerId, date, h, m })
    setDialogOpen(true)
  }

  function openEdit(ev: PlannerEvent) {
    setEditEvent(ev)
    setPrefill({})
    setDialogOpen(true)
  }

  function handleDrop(ev: PlannerEvent, newSewerId: string, newH: number, newM: number) {
    updateEvent({ id: ev._id, sewerId: newSewerId, startH: newH, startM: newM })
  }

  const dialogKey = dialogOpen ? `${editEvent?._id ?? 'new'}-${JSON.stringify(prefill)}` : 'closed'

  return (
    <div className="flex flex-col gap-4 p-4 h-full w-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 rounded-md border bg-muted/30 p-1">
          {(['day', 'week'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                'px-3 py-1 rounded text-sm font-medium transition-colors',
                view === v ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {v === 'day' ? 'День' : 'Тиждень'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" onClick={() => navigate(-1)}><ChevronLeft size={16} /></Button>
          <span className="text-sm font-medium min-w-[160px] text-center">
            {view === 'day'
              ? currentDate.toLocaleDateString('uk-UA', { weekday: 'short', day: 'numeric', month: 'long' })
              : `${monday.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })} – ${addDays(monday, 4).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', year: 'numeric' })}`
            }
          </span>
          <Button variant="ghost" size="icon-sm" onClick={() => navigate(1)}><ChevronRight size={16} /></Button>
        </div>

        <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>Сьогодні</Button>

        <Button size="sm" className="ml-auto" onClick={() => openNew(undefined, dateStr)}>
          <Plus size={14} /> Запланувати
        </Button>
      </div>

      {/* Calendar */}
      <div className="flex-1 overflow-auto border rounded-lg">
        {view === 'day' ? (
          <DayView
            date={dateStr}
            events={events}
            onSlotClick={(sewerId, h, m) => openNew(sewerId, dateStr, h, m)}
            onEdit={openEdit}
            onDrop={handleDrop}
          />
        ) : (
          <WeekView
            monday={monday}
            events={events}
            onCellClick={(sewerId, date) => openNew(sewerId, date)}
            onEdit={openEdit}
          />
        )}
      </div>

      <EventFormDialog
        key={dialogKey}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        orders={orders}
        prefillSewer={prefill.sewerId}
        prefillDate={prefill.date}
        prefillH={prefill.h}
        prefillM={prefill.m}
        editEvent={editEvent}
      />

      <Dialog open={!!deleteConfirm} onOpenChange={v => !v && setDeleteConfirm(undefined)}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Видалити подію?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Замовлення #{deleteConfirm?.orderNumber} буде видалено з розкладу.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(undefined)}>Скасувати</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteConfirm) deleteEvent({ id: deleteConfirm._id }, { onSuccess: () => setDeleteConfirm(undefined) })
              }}
            >
              <Trash2 size={14} /> Видалити
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}