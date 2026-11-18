import { type FunctionReturnType } from 'convex/server'
import { api } from 'convex/_generated/api'
import { CornerDownRight } from 'lucide-react'

export type MaterialRequirement = FunctionReturnType<typeof api.queries.movements.getOrderRequiredMaterials>[number]

export const isMaterialSufficient = (row: MaterialRequirement) =>
  !row.unassigned && row.available !== null && row.available >= row.quantity

const stockCls = (sufficient: boolean) =>
  `px-1.5 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${sufficient ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`

export const MaterialRequirementRow = ({ row }: { row: MaterialRequirement }) => (
  <div className="flex flex-col gap-0.5">
    <div className="flex items-center justify-between gap-2 text-xs">
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
        {!row.unassigned && <span className={stockCls(isMaterialSufficient(row))}>{row.available?.toFixed(2)}</span>}
      </div>
    </div>
    {row.alternatives.map(alt => (
      <div key={alt.variantId} className="flex items-center justify-between gap-2 pl-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-1 min-w-0">
          <CornerDownRight size={10} className="shrink-0" />
          <span className="truncate">{alt.supplierName ?? alt.sku}</span>
        </div>
        <span className={stockCls(alt.available >= row.quantity)}>{alt.available.toFixed(2)}</span>
      </div>
    ))}
  </div>
)
