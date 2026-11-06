import clsx from 'clsx'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from 'convex/_generated/api'
import { type Id } from 'convex/_generated/dataModel'

const formatQty = (value: number) => Number.isInteger(value) ? String(value) : value.toFixed(2)

const STATUS_STYLES = {
  same:    { mark: '',  className: '' },
  added:   { mark: '+', className: 'bg-green-50 text-green-700' },
  changed: { mark: '~', className: 'bg-violet-50 text-violet-700' },
  removed: { mark: '−', className: 'bg-red-50 text-red-600' },
} as const

type Props = {
  cuttingTaskId: Id<'cuttingTasks'>
  productName:   string
  color?:        string
}

export const CuttingSpecDetails = ({ cuttingTaskId, productName, color }: Props) => {
  const { data: groups, isLoading } = useQuery(convexQuery(api.queries.cutting.getCuttingTaskSpecDetails, { cuttingTaskId }))

  if (isLoading) {
    return (
      <div className="flex h-16 w-60 items-center justify-center">
        <div className="size-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  const header = (
    <div className="flex flex-col border-b pb-2">
      <span className="text-sm font-semibold capitalize">{productName}</span>
      {color && <span className="text-xs text-muted-foreground">{color}</span>}
    </div>
  )

  if (!groups || groups.length === 0) {
    return (
      <div className="flex flex-col gap-2 min-w-60 max-w-90">
        {header}
        <p className="text-xs text-muted-foreground">Специфікацію не знайдено</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 min-w-60 max-w-90">
      {header}
      {groups.map((group, gi) => (
        <div key={gi} className="flex flex-col gap-0.5">
          {groups.length > 1 && (
            <span className="text-[11px] font-medium text-muted-foreground mb-0.5">{group.sizes.join(', ')}</span>
          )}
          {group.lines.map((line, i) => {
            const style = STATUS_STYLES[line.status]
            return (
              <div key={`${line.lineId}-${i}`} className={clsx('flex items-center justify-between gap-3 rounded px-1.5 py-0.5 text-xs', style.className)}>
                <span className={clsx('min-w-0 truncate', line.status === 'removed' && 'line-through')}>
                  {line.name}
                  {line.color && <span className="opacity-60"> · {line.color}</span>}
                </span>
                <span className="flex shrink-0 items-center gap-1.5 font-medium">
                  {formatQty(line.quantity)} {line.units}
                  {style.mark && <span className="w-2.5 text-center font-semibold">{style.mark}</span>}
                </span>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
