import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from 'convex/_generated/api'
import { type Id } from 'convex/_generated/dataModel'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MaterialRequirementRow, isMaterialSufficient } from '@/components/material-requirement-row'

type Props = {
  productionOrderId: string
  materialsReserved?: boolean
}

export const MaterialsSection = ({ productionOrderId, materialsReserved }: Props) => {
  const [expanded, setExpanded] = useState(false)
  const { data } = useQuery(convexQuery(api.queries.movements.getOrderRequiredMaterials, {
    productionOrderId: productionOrderId as Id<'productionOrders'>,
  }))

  if (!data || data.length === 0) return null

  const allSufficient = data.every(isMaterialSufficient)

  return (
    <div className="flex flex-col gap-1.5 px-3 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Матеріали ({data.length})
          </p>
          {materialsReserved ? (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700">
              Зарезервовано
            </span>
          ) : (
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${allSufficient ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {allSufficient ? 'Достатньо' : 'Недостатньо'}
            </span>
          )}
        </div>
        <Button onClick={() => setExpanded(prev => !prev)} size="icon-sm" variant="outline" className="size-7">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </Button>
      </div>

      {expanded && (
        <div className="flex flex-col gap-1.5 mt-1">
          {data.map((row, i) => <MaterialRequirementRow key={i} row={row} />)}
        </div>
      )}
    </div>
  )
}
