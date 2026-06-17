import { useCallback, useContext, useState } from 'react'
import { useAction } from 'convex/react'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from 'convex/_generated/api'
import { type Id } from 'convex/_generated/dataModel'
import { useUpdateAllOrderItemsBrandingType, useAddProductionOrderItems, useCreateSubcontractorTask, useCreateProductionTasks } from './actions'
import { ArrowLeft, Truck, Plus, ClipboardList, FileSpreadsheet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ImagesSection } from '@/route-components/branding/components/images-section'
import { DialogContext } from '@/contexts/dialog'
import { DrawerContext } from '@/contexts/drawer'
import { type OrderItem } from './types'
import { ProgressSection } from './components/progress-section'
import { ProductGroup } from './components/product-group'
import { BulkBrandingForm } from './forms/bulk-branding-form'
import AddProductForm from './forms/add-product'
import { SubcontractorTaskForm } from './forms/subcontractor-task-form'
import { OrderLogs } from '@/components/order-logs'
// ─── Types ────────────────────────────────────────────────────────────────────

export type Props = {
  productionOrderId: string | null
  onBack?: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (ts: number) =>
  new Date(ts).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: '2-digit' })

// ─── SubcontractorSection ─────────────────────────────────────────────────────

const statusLabels: Record<string, string> = {
  sent:        'Відправлено',
  in_progress: 'В процесі',
  returned:    'Повернено',
  delayed:     'Затримано',
  waiting_to_sent: 'Очікує відправки',
}

const typeLabels: Record<string, string> = {
  sublimation: 'Сублімація',
  embroidery:  'Вишивка',
  silkscreen:  'Шовкодрук',
  dtg:         'DTG',
  dtf:         'DTF',
  other:       'Інше',
}

const statusColors: Record<string, string> = {
  sent:        'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  returned:    'bg-green-100 text-green-700',
  delayed:     'bg-red-100 text-red-700',
}

const SIZES = ['4XS', '3XS', 'XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL']

const buildSheetRows = (order: any, items: OrderItem[]): string[][] => {
  const groups = new Map<string, OrderItem[]>()
  for (const item of items) {
    const key = `${item.name}__${item.color}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(item)
  }

  const dateStr = new Date(order.plannedShipDate).toLocaleDateString('uk-UA', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })

  const allGroups = Array.from(groups.values())

  return allGroups.map((groupItems, index) => {
    const first = groupItems[0]
    const sizeMap: Record<string, number> = {}
    for (const item of groupItems) sizeMap[item.size] = item.quantity
    const groupTotal = groupItems.reduce((s, i) => s + i.quantity, 0)
    const orderId = allGroups.length > 1
      ? `${order.keycrmOrderId}-(${index + 1})`
      : order.keycrmOrderId

    return [
      orderId,                                               // № замовлення
      dateStr,                                               // дата видачі
      '',                                                    // година видачі
      first.name,                                            // тип виробів
      '-',                      // тип матеріалу
      first.color,                                           // колір виробів
      ...SIZES.map(s => String(sizeMap[s] ?? '')),          // size columns
      String(groupTotal),                                    // к-сть виробів (шт)
      first.keycrmProductComment ?? '',                      // примітка для крою
      first.sewingComment ?? '',                             // примітка для пошиву
      String(order.totalQty),                               // кількість виробів в замовленні
      String(first.brandingType?.length ?? ''),             // кількість принтів на 1 виріб
      first.brandingComment ?? '',                           // примітка для друку
      first.cuttingBrandingType?.join(', ') ?? '',          // Брендування на кроях
      '',                                                    // Очікувана готовність брендованих кроях
    ]
  })
}

const SubcontractorSection = ({ productionOrderId }: { productionOrderId: string }) => {
  const { mutateAsync: createTask } = useCreateSubcontractorTask()
  const { openDialog, closeDialog } = useContext(DialogContext)

  const { data: tasks = [] } = useQuery(
    convexQuery(api.queries.orders.getSubcontractorTasksByOrder, {
      productionOrderId: productionOrderId as Id<'productionOrders'>,
    })
  )

  const handleAdd = useCallback(() => {
    const id = openDialog({
      title:   'Додати завдання',
      content: (
        <SubcontractorTaskForm
          onSubmit={(values) => {
            createTask({
              productionOrderId: productionOrderId as Id<'productionOrders'>,
              name:               values.name,
              type:               values.type,
              quantity:           values.quantity ? Number(values.quantity) : undefined,
              sentDate:           values.sentDate,
              expectedReturnDate: values.expectedReturnDate,
              status:             values.status,
              note:               values.note || undefined,
            })
            closeDialog(id)
          }}
        />
      ),
    })
  }, [productionOrderId, createTask, openDialog, closeDialog])

  return (
    <div className="flex flex-col gap-2 px-3 py-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Підрядники ({tasks.length})
        </p>
        <Button size="sm" variant="secondary" className="h-6 text-[11px] px-2" onClick={handleAdd}>
          <Plus size={10} className="mr-1" /> Додати Підряд
        </Button>
      </div>

      {tasks.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {tasks.map(task => (
            <div key={task._id} className="border rounded-md px-2.5 py-2 flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <div className='flex gap-2 items-center min-w-0'>
                  <span className="text-sm font-medium truncate">{task.name}</span>
                  <span className='text-xs bg-amber-200 rounded-2xl px-2 items-center'>{typeLabels[task.type]}</span>
                </div>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${statusColors[task.status]}`}>
                  {statusLabels[task.status]}
                </span>
              </div>
              <div className="flex gap-3 text-[11px] text-muted-foreground">
                {task.quantity != null && <span>{task.quantity} шт</span>}
                <span>від {formatDate(task.sentDate)}</span>
                <span>до {formatDate(task.expectedReturnDate)}</span>
                {task.userName && <span className='ml-auto'>{task.userName}</span>}
              </div>
              {task.note && (
                <p className="text-[11px] text-muted-foreground">{task.note}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── ProductsSection ──────────────────────────────────────────────────────────

const ProductsSection = ({ items, productionOrderId }: { items: OrderItem[]; productionOrderId: string }) => {
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
          <Button size="sm" variant="secondary" className="h-6 text-[11px] px-2" onClick={handleAddProduct}>
            <Plus size={10} className="mr-1" /> Додати товари
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
  const { openDrawer } = useContext(DrawerContext)
  const [exporting, setExporting] = useState(false)
  const backupToSheet = useAction(api.http_actions.googleSheets.backupToSheet)
  const { mutate: createTasks, isPending: creatingTasks } = useCreateProductionTasks()

  const { data: order } = useQuery(
    convexQuery(api.queries.orders.getProductionOrderDetails, {
      productionOrderId: productionOrderId as Id<'productionOrders'>,
    })
  )

  const handleOpenLogs = useCallback(() => {
    openDrawer({
      direction: 'right',
      title: 'Журнал змін',
      outerClose: true,
      className: 'w-120',
      content: <OrderLogs productionOrderId={productionOrderId} />,
    })
  }, [productionOrderId, openDrawer])

  const handleExportToSheet = useCallback(async () => {
    if (!order) return
    setExporting(true)
    try {
      const rows = buildSheetRows(order, order.items as OrderItem[])
      await backupToSheet({ rows })
    } finally {
      setExporting(false)
    }
  }, [order, backupToSheet])

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
            <Button variant="ghost" size="icon" onClick={onBack} className="-ml-1 size-8">
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
          <Button variant="ghost" size="icon" onClick={handleExportToSheet} disabled={exporting} className="size-8 shrink-0">
            <FileSpreadsheet size={15} />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleOpenLogs} className="size-8 shrink-0">
            <ClipboardList size={15} />
          </Button>
        </div>

        <ScrollArea className="h-25 w-full" aria-orientation='horizontal'>
          <ImagesSection files={(order.attachedFiles ?? []) as any[]} />
        </ScrollArea>
        <div className="border-t">
          <ProgressSection
            cutDone={order.cutDone}           cutTotal={order.cutTotal}
            sewDone={order.sewDone}           sewTotal={order.sewTotal}
            brandingDone={order.brandingDone} brandingTotal={order.brandingTotal}
            packingDone={order.packingDone}   packingTotal={order.packingTotal}
            inProduction={order?.inProduction}
            onCreateTasks={() => createTasks({ productionOrderId: productionOrderId as any })}
            creatingTasks={creatingTasks}
          />
        </div>
        <div className="border-t px-3 py-3 shrink-0">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Всього</span>
            <span className="font-semibold">{order.totalQty} шт</span>
          </div>
        </div>
        <div className="border-t">
          <SubcontractorSection productionOrderId={productionOrderId} />
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
