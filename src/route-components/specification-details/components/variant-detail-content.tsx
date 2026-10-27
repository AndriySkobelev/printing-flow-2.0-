import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { format } from 'date-fns'
import { UTCDate } from '@date-fns/utc'
import { CheckCheck } from 'lucide-react'
import { api } from 'convex/_generated/api'
import { type Id } from 'convex/_generated/dataModel'

const InfoItem = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-[11px] text-muted-foreground">{label}</span>
    <span className="text-sm font-medium">{children}</span>
  </div>
)

const VariantDetailContent = ({ productId }: { productId: Id<'products'> }) => {
  const { data, isLoading } = useQuery(
    convexQuery(api.queries.products.getProductVariantDetails, { productId })
  )

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <div className="size-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!data) return <p className="text-sm text-muted-foreground">Варіант не знайдено</p>

  const unassignedCount = data.lines.filter(line => !line.assignedVariant).length

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-3 rounded-md bg-primary/5 p-3">
        <InfoItem label="Специфікація">{data.specName}</InfoItem>
        <InfoItem label="SKU"><span className="font-mono">{data.sku}</span></InfoItem>
        <InfoItem label="Розмір / Колір">{data.size} · {data.color}</InfoItem>
        <InfoItem label="Тип обробки">{data.processingType ?? '—'}</InfoItem>
        <InfoItem label="KeyCRM">
          {data.migrated
            ? <span className="flex items-center gap-1 text-green-600"><CheckCheck size={14} />Змігровано</span>
            : <span className="text-muted-foreground">Не змігровано</span>}
        </InfoItem>
        <InfoItem label="Остання синхронізація">
          {data.syncedAt ? format(new UTCDate(data.syncedAt), 'dd.MM.yyyy HH:mm') : '—'}
        </InfoItem>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Матеріали ({data.lines.length})
          </p>
          {unassignedCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-medium">
              Не призначено: {unassignedCount}
            </span>
          )}
        </div>
        {data.lines.map((line, i) => (
          <div key={line.lineId ?? i} className="flex items-center gap-3 py-2 border-b last:border-0">
            <div className="flex flex-col flex-1 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="px-1.5 py-0.5 rounded-full bg-secondary text-secondary-foreground text-[10px] shrink-0">
                  {line.type === 'material' ? 'Матеріал' : 'Тканина'}
                </span>
                <span className="text-sm font-medium truncate">{line.lineName ?? line.name}</span>
              </div>
              {line.lineName && <span className="text-xs text-muted-foreground truncate">{line.name}</span>}
            </div>
            <div className="flex flex-col items-end shrink-0 text-xs">
              <span className="font-medium">{line.totalQuantity} {line.units}</span>
              {line.multiplier !== 1 && (
                <span className="text-muted-foreground">{line.quantity} × {line.multiplier}</span>
              )}
            </div>
            <div className="flex flex-col items-end min-w-0 w-64">
              {line.assignedVariant ? (
                <>
                  <span className="text-sm truncate max-w-full">{line.assignedVariant.label}</span>
                  {line.assignedVariant.sku && (
                    <span className="text-xs font-mono text-muted-foreground">{line.assignedVariant.sku}</span>
                  )}
                </>
              ) : (
                <span className="text-xs text-muted-foreground italic">не призначено</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default VariantDetailContent
