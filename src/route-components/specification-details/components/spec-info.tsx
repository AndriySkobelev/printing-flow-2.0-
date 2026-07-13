import { Separator } from 'radix-ui'
import { Clock, Scissors, Package, Palette, DollarSign } from 'lucide-react'

type Material = {
  name?: string
  color?: string
  size?: string
  quantity: number | string
  units: string
  type?: string
}

type Spec = {
  name: string
  category: string
  skuPrefix: string
  productionPrice?: number | string
  productionTime?: number | string
  cutTime?: number | string
  packingTime?: number | string
  brandingTime?: number | string
  materials: Material[]
}

type Props = {
  spec: Spec
}

const InfoRow = ({ label, value }: { label: string; value?: React.ReactNode }) => {
  if (!value && value !== 0) return null
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium text-right">{value}</span>
    </div>
  )
}

const TimeRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value?: number | string }) => {
  if (!value && value !== 0) return null
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium ml-auto">{value} хв</span>
    </div>
  )
}

export const SpecInfo = ({ spec }: Props) => (
  <div className="flex flex-col gap-3 px-3 py-3">
    <div className="flex flex-col gap-0.5">
      <InfoRow label="Категорія" value={spec.category} />
      <InfoRow label="SKU префікс" value={spec.skuPrefix} />
      {spec.productionPrice !== undefined && (
        <InfoRow
          label="Ціна виробництва"
          value={
            <span className="flex items-center gap-1">
              <DollarSign size={11} />
              {spec.productionPrice}
            </span>
          }
        />
      )}
    </div>

    <Separator.Separator className="h-px bg-border" />

    <div className="flex flex-col gap-1">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
        Час виготовлення
      </p>
      <TimeRow icon={<Clock size={12} />} label="Пошиття" value={spec.productionTime} />
      <TimeRow icon={<Scissors size={12} />} label="Крій" value={spec.cutTime} />
      <TimeRow icon={<Package size={12} />} label="Пакування" value={spec.packingTime} />
      <TimeRow icon={<Palette size={12} />} label="Брендинг" value={spec.brandingTime} />
    </div>

    {spec.materials.length > 0 && (
      <>
        <Separator.Separator className="h-px bg-border" />
        <div className="flex flex-col gap-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            Матеріали
          </p>
          {spec.materials.map((m, i) => (
            <div key={i} className="flex flex-col gap-0.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium truncate">{m.name ?? '—'}</span>
                <span className="text-xs text-muted-foreground shrink-0">{m.quantity} {m.units}</span>
              </div>
              {(m.color || m.size) && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  {m.color && <span>{m.color}</span>}
                  {m.color && m.size && <Separator.Separator orientation="vertical" className="w-px h-2 bg-border inline-block" />}
                  {m.size && <span>{m.size}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      </>
    )}
  </div>
)
