import { useMemo, useCallback, useContext } from 'react'
import { groupBy, values, set, lensProp, keys, omit, pick } from 'ramda';
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from 'convex/_generated/api'
import { type Id } from 'convex/_generated/dataModel'
import { useUpdateAllOrderItemsBrandingType, useAddProductionOrderItems } from './actions'
import { ArrowLeft, Truck, Scissors, Package, Palette, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ImagesSection } from '@/route-components/branding/components/images-section'
import { DialogContext } from '@/contexts/dialog'
import { DrawerContext } from '@/contexts/drawer'
import { type OrderItem, type BrandingTypeValue } from './types'
import { ProgressStat } from './components/progress-stat'
import { ProductGroup } from './components/product-group'
import { BulkBrandingForm } from './forms/bulk-branding-form'
import AddProductForm from './forms/add-product'
// ─── Types ────────────────────────────────────────────────────────────────────

export type Props = {
  productionOrderId: string | null
  onBack?: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (ts: number) =>
  new Date(ts).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: '2-digit' })

// ─── ProductsSection ──────────────────────────────────────────────────────────

const ProductsSection = ({ items, productionOrderId }: { items: OrderItem[]; productionOrderId: string }) => {
  console.count('ProductsSection render')
  const { mutate: updateAll } = useUpdateAllOrderItemsBrandingType()
  const { mutate: addItems }  = useAddProductionOrderItems()
  const { openDialog, closeDialog } = useContext(DialogContext)
  const { openDrawer, closeDrawer } = useContext(DrawerContext)

  const handleConfigureAll = useCallback(() => {
    const id = openDialog({
      title:   'Налаштувати всі',
      content: (
        <BulkBrandingForm
          onSubmit={async ({ brandingType, cuttingBrandingType, brandingComment, sewingComment }) => {
            await updateAll({
              productionOrderId:   productionOrderId as Id<'productionOrders'>,
              brandingType:        brandingType.length        ? brandingType        : undefined,
              cuttingBrandingType: cuttingBrandingType.length ? cuttingBrandingType : undefined,
              brandingComment:     brandingComment  || undefined,
              sewingComment:       sewingComment    || undefined,
            })
            closeDialog(id)
          }}
        />
      ),
    })
  }, [productionOrderId, updateAll, openDialog, closeDialog])

  const handleAddProduct = useCallback(() => {
    openDrawer({
      direction: 'right',
      title:   'Додати товар',
      outerClose: true,
      className: 'w-150',
      formId: 'add-product-form',
      content: (
        <AddProductForm
          formId="add-product-form"
          onSubmit={({ products }) => {
            addItems(
              {
                productionOrderId: productionOrderId as Id<'productionOrders'>,
                items: products.map(p => ({
                  name:         p.name,
                  sku:          p.sku,
                  color:        p.color,
                  size:         p.size,
                  quantity:     Number(p.quantity),
                  shipmentType: p.shipmentType,
                })),
              },
              { onSuccess: () => closeDrawer() },
            )
          }}
        />
      ),
    })
  }, [productionOrderId, openDrawer, closeDrawer])

  return (
    <section className="p-3 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className='flex items-center gap-2'>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Товари ({items.length})
          </p>
          <Button size="sm" variant="default" className="h-6 text-[11px] px-2" onClick={handleAddProduct}>
            Додати товари
          </Button>
        </div>
        <div className='flex items-center gap-2'>
          <Button size="sm" variant="outline" className="h-6 text-[11px] px-2" onClick={handleConfigureAll}>
            Налаштувати всі
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Немає товарів</p>
      ) : (
        <ProductGroup items={items} />
      )}
    </section>
  )
}

// ─── OrderDetailsContent ──────────────────────────────────────────────────────

const OrderDetailsContent = ({ productionOrderId, onBack }: { productionOrderId: string; onBack?: () => void }) => {
  const { data: order } = useQuery(
    convexQuery(api.queries.orders.getProductionOrderDetails, {
      productionOrderId: productionOrderId as Id<'productionOrders'>,
    })
  )

  if (!order) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="size-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  const items = order.items as OrderItem[]

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Left: order info ──────────────────────────────────────────── */}
      <div className="w-100 shrink-0 border-r flex flex-col">

        <div className="flex items-start gap-2 px-3 py-3 border-b shrink-0">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack} className="-ml-1 size-8 md:hidden">
              <ArrowLeft />
            </Button>
          )}
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <p className="text-sm font-semibold">#{order.keycrmOrderId}</p>
            {order.keycrmManager && (
              <span className="text-xs text-muted-foreground truncate">{order.keycrmManager}</span>
            )}
            <span className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
              <Truck size={11} />
              <b className="text-foreground">{formatDate(order.plannedShipDate)}</b>
            </span>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <ImagesSection files={(order.attachedFiles ?? []) as any[]} />

          <div className="flex flex-col gap-3 px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Прогрес
            </p>
            <ProgressStat label="Розкрій"     done={order.cutDone}      total={order.cutTotal}      color="#0ea5e9" icon={<Scissors size={11} />} />
            <ProgressStat label="Пошив"       done={order.sewDone}      total={order.sewTotal}      color="#8b5cf6" icon={<Wand2    size={11} />} />
            <ProgressStat label="Брендування" done={order.brandingDone} total={order.brandingTotal} color="#f59e0b" icon={<Palette  size={11} />} />
            <ProgressStat label="Пакування"   done={order.packingDone}  total={order.packingTotal}  color="#10b981" icon={<Package  size={11} />} />
          </div>
        </ScrollArea>

        <div className="border-t px-3 py-3 shrink-0">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Всього</span>
            <span className="font-semibold">{order.totalQty} шт</span>
          </div>
        </div>
      </div>

      {/* ── Right: products ───────────────────────────────────────────── */}
      <ScrollArea className="flex-1">
        <ProductsSection items={items} productionOrderId={productionOrderId} />
      </ScrollArea>
    </div>
  )
}

// ─── OrderDetails ─────────────────────────────────────────────────────────────

export const OrderDetails = ({ productionOrderId, onBack }: Props) => {
  if (!productionOrderId) {
    return (
      <div className="flex h-full shadow-[0px_0px_3px_#021b333d] rounded-lg bg-background items-center justify-center">
        <p className="text-sm text-muted-foreground">Оберіть замовлення</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full shadow-[0px_0px_3px_#021b333d] rounded-lg bg-background overflow-hidden">
      <OrderDetailsContent productionOrderId={productionOrderId} onBack={onBack} />
    </div>
  )
}
