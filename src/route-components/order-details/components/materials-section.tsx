import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from 'convex/_generated/api'
import { type Id } from 'convex/_generated/dataModel'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Props = {
  productionOrderId: string
}

export const MaterialsSection = ({ productionOrderId }: Props) => {
  const [expanded, setExpanded] = useState(false)
  const { data } = useQuery(convexQuery(api.queries.movements.getOrderRequiredMaterials, {
    productionOrderId: productionOrderId as Id<'productionOrders'>,
  }))

  if (!data || data.length === 0) return null

  const isRowSufficient = (row: (typeof data)[number]) =>
    !row.unassigned && row.available !== null && row.available >= row.quantity
  const allSufficient = data.every(isRowSufficient)

  return (
    <div className="flex flex-col gap-1.5 px-3 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Матеріали ({data.length})
          </p>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${allSufficient ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {allSufficient ? 'Достатньо' : 'Недостатньо'}
          </span>
        </div>
        <Button onClick={() => setExpanded(prev => !prev)} size="sm" variant="outline" className="h-6">
          {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
        </Button>
      </div>

      {expanded && (
        <div className="flex flex-col gap-1.5 mt-1">
          {data.map((row, i) => {
            const insufficient = !row.unassigned && row.available !== null && row.available < row.quantity
            return (
              <div key={i} className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-medium truncate">{row.material?.name ?? '—'}</span>
                  {row.material && 'color' in row.material && row.material.color && (
                    <span className="text-muted-foreground shrink-0">
                      {row.material.color}{'size' in row.material && row.material.size ? ` · ${row.material.size}` : ''}
                    </span>
                  )}
                  {row.unassigned && (
                    <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-medium shrink-0">
                      Не виз.
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="font-medium">{row.quantity.toFixed(2)} {row.units}</span>
                  {!row.unassigned && (
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${insufficient ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {row.available?.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
