import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { UTCDate } from '@date-fns/utc'
import { api } from 'convex/_generated/api'
import { type Id } from 'convex/_generated/dataModel'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MyPopover } from '@/components/my-popover'
import { OrderImages } from '@/route-components/order-details/components/order-images'
import { SubcontractorSection } from '@/route-components/order-details/components/subcontractor-section'
import { BRANDING_TYPES, BRANDING_LABELS, type BrandingTypeValue } from '@/route-components/order-details/types'

const formatDate = (ts: number) =>
  new UTCDate(ts).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' })

const InfoItem = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
    <div className="text-xs font-medium">{children}</div>
  </div>
)

type CustomItem = { _id: string; name: string; color: string; size: string; comment?: string | null }

// One kind of custom work (cut or sewing) across the order: a violet badge
// whose popover lists each custom item with its comment.
const CustomBadge = ({ label, items }: { label: string; items: CustomItem[] }) => (
  <MyPopover
    align="start"
    withArrow
    trigger={
      <Button
        type="button"
        variant="ghost"
        className="h-auto gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-violet-100 text-violet-700 hover:bg-violet-200 hover:text-violet-800"
      >
        <Sparkles size={11} />
        {`${label} (${items.length})`}
      </Button>
    }
    content={
      <div className="flex flex-col gap-1.5 min-w-56 max-w-80">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        {items.map(item => (
          <div key={item._id} className="flex flex-col text-xs">
            <span className="font-medium">{`${item.name} · ${item.color} · ${item.size}`}</span>
            <span className={item.comment ? 'text-foreground/80' : 'text-muted-foreground italic'}>
              {item.comment || 'Без коментаря'}
            </span>
          </div>
        ))}
      </div>
    }
  />
)

type Props = {
  productionOrderId: string
  // Order items of the sewing task this panel is shown for — custom work is
  // per product, so only these items' custom flags are listed.
  itemIds: string[]
}

export const OrderInfoPanel = ({ productionOrderId, itemIds }: Props) => {
  const { data: order, isLoading } = useQuery(convexQuery(api.queries.orders.getProductionOrderDetails, {
    productionOrderId: productionOrderId as Id<'productionOrders'>,
  }))

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <div className="size-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!order) return <p className="text-xs text-muted-foreground">Замовлення не знайдено</p>

  // Every branding type used by any item of the order, on cutting or after sewing.
  const usedTypes = new Set<BrandingTypeValue>(
    order.items.flatMap(i => [...(i.brandingType ?? []), ...(i.cuttingBrandingType ?? [])]) as BrandingTypeValue[]
  )
  const brandingTypes = BRANDING_TYPES.filter(t => usedTypes.has(t))

  const taskItems = order.items.filter(i => itemIds.includes(i._id))
  const customCut = taskItems
    .filter(i => i.isCustomCut)
    .map(i => ({ _id: i._id, name: i.name, color: i.color, size: i.size, comment: i.customCutComment }))
  const customSewing = taskItems
    .filter(i => i.isCustomSewing)
    .map(i => ({ _id: i._id, name: i.name, color: i.color, size: i.size, comment: i.customSewingComment }))

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 px-3">
        <div className="grid grid-cols-2 gap-3">
          <InfoItem label="Менеджер">{order.keycrmManager ?? '—'}</InfoItem>
          <InfoItem label="Дата відправки">{formatDate(order.plannedShipDate)}</InfoItem>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <InfoItem label="Брендування">
            {brandingTypes.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {brandingTypes.map(type => (
                  <span key={type} className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary/10 text-primary">
                    {BRANDING_LABELS[type]}
                  </span>
                ))}
              </div>
            ) : '—'}
          </InfoItem>
          <InfoItem label="Кастом">
            {customCut.length > 0 || customSewing.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {customCut.length > 0 && <CustomBadge label="Крій" items={customCut} />}
                {customSewing.length > 0 && <CustomBadge label="Пошив" items={customSewing} />}
              </div>
            ) : '—'}
          </InfoItem>
        </div>
      </div>

      <div className="border-t">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-3 pt-3">Візуал</p>
        {order.attachedFiles.length > 0
          ? <OrderImages productionOrderId={productionOrderId} keycrmOrderId={order.keycrmOrderId} files={order.attachedFiles as any[]} readOnly />
          : <p className="text-xs text-muted-foreground px-3 py-2">Немає візуалу</p>}
      </div>

      <div className="border-t">
        <SubcontractorSection productionOrderId={productionOrderId} readOnly />
      </div>
    </div>
  )
}
