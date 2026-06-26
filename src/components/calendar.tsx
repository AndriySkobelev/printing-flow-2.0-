import { useCallback, useMemo, useState, lazy, Suspense } from 'react'
import {
  dateFnsLocalizer,
  type SlotInfo,
  type View,
} from 'react-big-calendar'
import { format, getDay, parse, startOfWeek } from 'date-fns'
import { uk } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const Calendar = lazy(() =>
  import('react-big-calendar').then(m => ({ default: m.Calendar }))
)

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (d: Date) => startOfWeek(d, { locale: uk }),
  getDay,
  locales: { uk },
})

export type CalendarEventType =
  | 'cutting'
  | 'sewing'
  | 'branding'
  | 'packaging'
  | 'subcontractor'

export type CalendarEvent = {
  id: string
  title: string
  start: Date
  end: Date
  type?: CalendarEventType
  status?: string
  allDay?: boolean
  resource?: unknown
}

const EVENT_COLORS: Record<CalendarEventType, { bg: string; border: string; text: string }> = {
  cutting:       { bg: '#dbeafe', border: '#3b82f6', text: '#1d4ed8' },
  sewing:        { bg: '#ede9fe', border: '#8b5cf6', text: '#6d28d9' },
  branding:      { bg: '#ffedd5', border: '#f97316', text: '#c2410c' },
  packaging:     { bg: '#d1fae5', border: '#10b981', text: '#065f46' },
  subcontractor: { bg: '#fce7f3', border: '#ec4899', text: '#9d174d' },
}

export const EVENT_TYPE_LABELS: Record<CalendarEventType, string> = {
  cutting:       'Розкрій',
  sewing:        'Пошив',
  branding:      'Брендування',
  packaging:     'Пакування',
  subcontractor: 'Підрядник',
}

const VIEWS: { key: View; label: string }[] = [
  { key: 'month',  label: 'Місяць'  },
  { key: 'week',   label: 'Тиждень' },
  { key: 'day',    label: 'День'    },
  { key: 'agenda', label: 'Список'  },
]

const RBC_MESSAGES = {
  allDay:          'Весь день',
  previous:        '',
  next:            '',
  today:           'Сьогодні',
  month:           'Місяць',
  week:            'Тиждень',
  day:             'День',
  agenda:          'Список',
  date:            'Дата',
  time:            'Час',
  event:           'Подія',
  noEventsInRange: 'Немає подій у цьому діапазоні',
  showMore:        (n: number) => `+${n} ще`,
}

type Props = {
  events?: CalendarEvent[]
  onSelectEvent?: (event: CalendarEvent) => void
  onSelectSlot?: (slotInfo: SlotInfo) => void
  defaultView?: View
  className?: string
}

export function BigCalendar({
  events = [],
  onSelectEvent,
  onSelectSlot,
  defaultView = 'month',
  className,
}: Props) {
  const [view, setView] = useState<View>(defaultView)
  const [date, setDate] = useState(new Date())

  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    const colors = event.type ? EVENT_COLORS[event.type] : undefined
    if (!colors) return {}
    return {
      style: {
        backgroundColor: colors.bg,
        borderColor:     colors.border,
        color:           colors.text,
        borderWidth:     1,
        borderStyle:     'solid',
        borderRadius:    '6px',
        fontSize:        '12px',
        fontWeight:      500,
        padding:         '2px 6px',
        boxShadow:       'none',
      },
    }
  }, [])

  function navigate(dir: 1 | -1) {
    setDate(prev => {
      const d = new Date(prev)
      if (view === 'month') d.setMonth(d.getMonth() + dir)
      else if (view === 'week') d.setDate(d.getDate() + dir * 7)
      else if (view === 'day' || view === 'agenda') d.setDate(d.getDate() + dir)
      return d
    })
  }

  const title = useMemo(() => {
    if (view === 'month') {
      return date.toLocaleDateString('uk-UA', { month: 'long', year: 'numeric' })
    }
    if (view === 'week') {
      const start = startOfWeek(date, { locale: uk })
      const end = new Date(start)
      end.setDate(start.getDate() + 6)
      const s = start.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })
      const e = end.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', year: 'numeric' })
      return `${s} – ${e}`
    }
    return date.toLocaleDateString('uk-UA', {
      weekday: 'short',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }, [date, view])

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center rounded-md border bg-muted/30 p-1 gap-0.5">
          {VIEWS.map(v => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              className={cn(
                'px-3 py-1 rounded text-sm font-medium transition-colors',
                view === v.key
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {v.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" onClick={() => navigate(-1)}>
            <ChevronLeft size={16} />
          </Button>
          <span className="text-sm font-medium min-w-[220px] text-center capitalize">
            {title}
          </span>
          <Button variant="ghost" size="icon-sm" onClick={() => navigate(1)}>
            <ChevronRight size={16} />
          </Button>
        </div>

        <Button variant="outline" size="sm" onClick={() => setDate(new Date())}>
          Сьогодні
        </Button>

        <div className="ml-auto flex items-center gap-2 flex-wrap">
          {(Object.entries(EVENT_TYPE_LABELS) as [CalendarEventType, string][]).map(([type, label]) => (
            <div key={type} className="flex items-center gap-1.5">
              <span
                className="size-2.5 rounded-full"
                style={{ background: EVENT_COLORS[type].border }}
              />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="border rounded-lg bg-background" style={{ height: 'calc(90vh - 180px)' }}>
        <Suspense fallback={<div className="h-full flex items-center justify-center text-sm text-muted-foreground">Завантаження...</div>}>
          <Calendar
            localizer={localizer}
            events={events}
            view={view}
            date={date}
            onNavigate={setDate}
            onView={setView}
            onSelectEvent={onSelectEvent as any}
            onSelectSlot={onSelectSlot}
            selectable={!!onSelectSlot}
            eventPropGetter={eventStyleGetter as any}
            messages={RBC_MESSAGES}
            culture="uk"
            toolbar={false}
            style={{ height: '100%', padding: '8px' }}
            popup
          />
        </Suspense>
      </div>
    </div>
  )
}
