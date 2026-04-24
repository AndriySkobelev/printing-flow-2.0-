import clsx from 'clsx'

export type SpecData = {
  name: string
  category: string
  skuPrefix: string
  productionPrice?: number | string
  materials: Array<{
    materialName?: string
    quantity: number | string
    units: string
    type?: string
  }>
}

type Props = {
  spec: SpecData
}

const TYPE_LABELS: Record<string, string> = {
  fabric:   'Тканина',
  material: 'Матеріал',
  base:     'База',
}

export function SpecInfo({ spec }: Props) {
  return (
    <div className="flex flex-col gap-2 min-w-[220px] max-w-[280px]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold leading-tight">{spec.name}</span>
        <span className="text-xs text-muted-foreground shrink-0">{spec.category}</span>
      </div>

      {spec.productionPrice != null && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Ціна виробництва</span>
          <span className="font-medium">{spec.productionPrice} грн</span>
        </div>
      )}

      {spec.materials.length > 0 && (
        <div className="flex flex-col gap-1 border-t pt-2">
          <span className="text-xs text-muted-foreground font-medium">Матеріали</span>
          {spec.materials.map((m, i) => (
            <div key={i} className="flex items-center justify-between gap-2 text-xs">
              <span className={clsx('truncate', !m.materialName && 'text-muted-foreground italic')}>
                {m.materialName ?? '—'}
                {m.type && (
                  <span className="ml-1 text-muted-foreground opacity-70">
                    ({TYPE_LABELS[m.type] ?? m.type})
                  </span>
                )}
              </span>
              <span className="font-medium shrink-0">{m.quantity} {m.units}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}