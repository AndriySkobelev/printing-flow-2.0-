import { DetailHeader } from './detail-header'
import { ProductItemCard } from './product-item-card'
import { LogsTable } from './logs-table'
import { ImagesSection } from './images-section'
import { CuttingSewingProgress } from './cutting-sewing-progress'
import type { BrandingTask } from '../index'
import { ScrollArea } from '@/components/ui/scroll-area'

type Tag = { name: string; color: string }
type OrderItem = { _id: string; name: string; color: string; size: string; quantity: number, shipmentType: string, materialProcessingType: string }
type BrandingLog = { _id: string; type: string; quantity: number; timestamp: number; comment?: string; productionOrderItemId: string }

type Props = {
  task: BrandingTask | null
  onBack: () => void
}

export const OrderDetail = ({ task, onBack }: Props) => {
  if (!task) {
    return (
      <div className="flex flex-col h-full shadow-[0px_0px_3px_#021b333d] rounded-lg bg-background">
        <div className="flex items-center px-4 py-3">
          <span className="text-sm text-muted-foreground">Оберіть замовлення</span>
        </div>
      </div>
    )
  }

  const orderItems = (task.orderItems ?? []) as OrderItem[]
  const logs       = (task.logs ?? []) as BrandingLog[]
  const tags       = (task.tags ?? []) as Tag[]
  const totalQty   = orderItems.reduce((s, i) => s + i.quantity, 0)
  const completedTotal = logs.filter(l => l.type === 'completed').reduce((s, l) => s + l.quantity, 0)

  const completedByItem = (itemId: string) =>
    logs.filter(l => l.productionOrderItemId === itemId && l.type === 'completed').reduce((s, l) => s + l.quantity, 0)

  const defectByItem = (itemId: string) =>
    logs.filter(l => l.productionOrderItemId === itemId && l.type !== 'completed').reduce((s, l) => s + l.quantity, 0)

  return (
    <div className="flex flex-col h-full shadow-[0px_0px_3px_#021b333d] rounded-lg bg-background overflow-hidden">

      <DetailHeader
        tags={tags}
        onBack={onBack}
        orderId={task.keycrmOrderId as string}
        manager={task.keycrmManager as string | null}
        brandingTaskId={task._id as string}
        identifierName={task.identifierName as string | null | undefined}
        endDate={task.endDate as number | null}
        totalQty={totalQty}
        completedTotal={completedTotal}
      />

      <CuttingSewingProgress productionOrderId={task.productionOrderId as string} />

      <div className="flex-1 overflow-y-auto">

        <ImagesSection files={(task.attachedFiles ?? []) as any[]} />

        {/* Products section */}
        <section className="p-3 flex flex-col gap-2">
          {orderItems.length === 0 && (
            <p className="text-sm text-muted-foreground">Немає товарів</p>
          )}
          <ScrollArea className="max-h-100">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              {[...orderItems].sort((a, b) => {
                const aDone = completedByItem(a._id) >= a.quantity ? 1 : 0
                const bDone = completedByItem(b._id) >= b.quantity ? 1 : 0
                return aDone - bDone
              }).map(item => (
                <ProductItemCard
                  key={item._id}
                  item={item}
                  completedQty={completedByItem(item._id)}
                  defectQty={defectByItem(item._id)}
                  brandingTaskId={task._id as string}
                />
              ))}
            </div>
          </ScrollArea>
        </section>

        {/* Logs section */}
        <section className="px-3 pb-4 flex flex-col gap-2">
          <LogsTable
            logs={logs}
            orderItems={orderItems}
          />
        </section>

      </div>
    </div>
  )
}
