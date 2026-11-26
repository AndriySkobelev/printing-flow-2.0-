import { type ReactNode } from 'react'
import clsx from 'clsx'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { type FunctionReturnType } from 'convex/server'
import { api } from 'convex/_generated/api'
import { type Id } from 'convex/_generated/dataModel'
import { FilePen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MyPopover } from '@/components/my-popover'

type SpecGroups = FunctionReturnType<typeof api.queries.orderItemSpec.getOrderItemSpecDetails>

type DisplayProps = {
  productName?: string
  color?:       string
  className?:   string
}

const formatQty = (value: number) => Number.isInteger(value) ? String(value) : value.toFixed(2)

const STATUS_STYLES = {
  same:    { mark: '',  className: '' },
  added:   { mark: '+', className: 'bg-green-50 text-green-700' },
  changed: { mark: '~', className: 'bg-violet-50 text-violet-700' },
  removed: { mark: '−', className: 'bg-red-50 text-red-600' },
} as const

const SpecDetailsView = ({ groups, isLoading, productName, color, className }: DisplayProps & {
  groups?:   SpecGroups
  isLoading: boolean
}) => {
  if (isLoading) {
    return (
      <div className="flex h-16 w-60 items-center justify-center">
        <div className="size-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className={clsx('flex flex-col gap-3', className)}>
      {productName && (
        <div className="flex flex-col border-b pb-2">
          <span className="text-sm font-semibold capitalize">{productName}</span>
          {color && <span className="text-xs text-muted-foreground">{color}</span>}
        </div>
      )}
      {!groups || groups.length === 0
        ? <p className="text-xs text-muted-foreground">Специфікацію не знайдено</p>
        : groups.map((group, gi) => (
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

export const CuttingSpecDetails = ({ cuttingTaskId, ...display }: DisplayProps & { cuttingTaskId: Id<'cuttingTasks'> }) => {
  const { data, isLoading } = useQuery(convexQuery(api.queries.cutting.getCuttingTaskSpecDetails, { cuttingTaskId }))
  return <SpecDetailsView groups={data} isLoading={isLoading} {...display} />
}

export const OrderItemSpecDetails = ({ itemId, ...display }: DisplayProps & { itemId: Id<'productionOrderItems'> }) => {
  const { data, isLoading } = useQuery(convexQuery(api.queries.orderItemSpec.getOrderItemSpecDetails, { itemId }))
  return <SpecDetailsView groups={data} isLoading={isLoading} {...display} />
}

export const SpecChangesPopover = ({ itemId, productName, color, trigger }: {
  itemId:       Id<'productionOrderItems'>
  productName?: string
  color?:       string
  trigger?:     ReactNode
}) => (
  <MyPopover
    align="start"
    withArrow
    trigger={trigger ??
      <Button type="button" variant="ghost" title="Специфікацію змінено" className="h-auto shrink-0 p-0 has-[>svg]:px-0 text-violet-500 hover:bg-transparent hover:text-violet-700">
        <FilePen size={13} />
      </Button>
    }
    content={<OrderItemSpecDetails itemId={itemId} productName={productName} color={color} className="min-w-60 max-w-90" />}
  />
)
