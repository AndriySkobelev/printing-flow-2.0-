import { CircleCheck, CircleAlert, Clock, CircleDashed } from 'lucide-react'
import { type FunctionReturnType } from 'convex/server'
import { api } from 'convex/_generated/api'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { MyPopover } from '@/components/my-popover'
import { ProgressBar } from '@/components/progress-bar'

export type FabricReservation = FunctionReturnType<typeof api.queries.cutting.getAllCuttingTasks>[number]['fabricReservations'][number]
type CoverageState = FabricReservation['stateNow']

const STATE: Record<CoverageState | 'missing', { icon: typeof CircleCheck; className: string; label: string }> = {
  full:    { icon: CircleCheck,  className: 'text-emerald-600', label: 'Є в наявності' },
  partial: { icon: CircleAlert,  className: 'text-amber-500',   label: 'Частково — треба дозамовити' },
  none:    { icon: Clock,        className: 'text-red-500',     label: 'Немає в наявності — чекаємо тканину' },
  missing: { icon: CircleDashed, className: 'text-muted-foreground/50', label: 'Матеріал не зарезервовано' },
}

const fmt = (n: number) => Number(n.toFixed(2)).toLocaleString('uk-UA')

// The worst state across the row's fabrics — what the cell icon shows.
const rowState = (items: FabricReservation[]): CoverageState | 'missing' => {
  if (items.length === 0) return 'missing'
  if (items.some(i => i.stateNow === 'none')) return 'none'
  if (items.some(i => i.stateNow === 'partial')) return 'partial'
  return 'full'
}

const Line = ({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) => (
  <div className="flex items-baseline justify-between gap-3 text-xs">
    <span className="text-muted-foreground">{label}</span>
    <span className={cn('font-medium tabular-nums text-right', className)}>{value}</span>
  </div>
)

const ReservationDetails = ({ r }: { r: FabricReservation }) => {
  const now     = STATE[r.stateNow]
  const NowIcon = now.icon
  const missing = Math.max(0, r.quantity - r.coveredNow)
  const u       = r.units

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-semibold">{r.name}{r.color ? ` · ${r.color}` : ''}</span>
          {r.sku && <span className="text-[11px] text-muted-foreground">{r.sku}</span>}
        </div>
        {r.needed != null && (
          <div className="flex flex-col items-end shrink-0">
            <span className="text-sm font-semibold tabular-nums">{`${fmt(r.needed)} ${u}`}</span>
            <span className="text-[11px] text-muted-foreground">треба на замовлення</span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1 rounded-md bg-muted/50 px-2 py-1.5">
        <span className={cn('flex items-center gap-1 text-xs font-medium', now.className)}>
          <NowIcon size={12} /> {now.label}
        </span>
        <ProgressBar done={r.coveredNow} total={r.quantity} size="md" />
        {r.freeAtReserve != null && (
          <Line label="Було в наявності при резерві" value={`${fmt(Math.max(0, r.freeAtReserve))} ${u}`} />
        )}
        <Line label="Зарезервовано" value={`${fmt(r.quantity)} ${u}`} />
        {r.coveredAtReserve != null && (
          <Line label="З них з наявності" value={`${fmt(r.coveredAtReserve)} ${u}`} />
        )}
        {missing > 0 && <Line label="Не вистачає" value={`${fmt(missing)} ${u}`} className="text-red-600" />}
        {r.used > 0 && <Line label="Використано на розкрій" value={`${fmt(r.used)} ${u}`} />}
      </div>
    </div>
  )
}

// "Матеріал" cell: fabric name with an icon of how its reservation stands, and
// the details in a popover.
export const MaterialReservationCell = ({ material, reservations }: { material: string; reservations: FabricReservation[] }) => {
  const state = STATE[rowState(reservations)]
  const Icon  = state.icon

  return (
    <MyPopover
      align="start"
      withArrow
      trigger={
        <Button
          type="button"
          variant="ghost"
          size="sm"
          title={state.label}
          className="h-auto p-0 gap-1.5 font-normal text-sm hover:bg-transparent hover:text-primary"
          onClick={e => e.stopPropagation()}
        >
          <Icon size={14} className={cn('shrink-0', state.className)} />
          <span className="truncate">{material}</span>
        </Button>
      }
      content={
        <div className="flex flex-col gap-3 w-72">
          {reservations.length === 0 && (
            <p className="text-xs text-muted-foreground">Для цього розкрою тканину не зарезервовано.</p>
          )}
          {reservations.map((r, i) => (
            <div key={r.materialId} className={cn(i > 0 && 'border-t pt-3')}>
              <ReservationDetails r={r} />
            </div>
          ))}
        </div>
      }
    />
  )
}
