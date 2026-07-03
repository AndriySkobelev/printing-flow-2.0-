import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from 'convex/_generated/api'
import { type Id } from 'convex/_generated/dataModel'

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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4 text-sm">
        <span className="text-muted-foreground">SKU:</span>
        <span className="font-mono font-medium">{data.sku}</span>
        <span className="text-muted-foreground">Розмір:</span>
        <span className="font-medium">{data.size}</span>
        <span className="text-muted-foreground">Колір:</span>
        <span className="font-medium">{data.color}</span>
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Матеріали</p>
        {data.lines.map((line, i) => (
          <div key={line.lineId ?? i} className="flex items-center gap-3 py-2 border-b last:border-0">
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-sm font-medium truncate">{line.name}</span>
              <span className="text-xs text-muted-foreground">{line.quantity} {line.units}</span>
            </div>
            <div className="flex flex-col items-end min-w-0">
              {line.assignedVariant ? (
                <>
                  <span className="text-sm truncate">{line.assignedVariant.label}</span>
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
