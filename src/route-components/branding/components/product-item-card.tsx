import { useContext } from 'react'
import { Separator } from 'radix-ui'
import { ProgressBar } from '@/components/progress-bar'
import { Plus, Scissors, Boxes, CircleQuestionMarkIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DialogContext } from '@/contexts/dialog'
import { type Id } from 'convex/_generated/dataModel'
import { BrandingLogForm, type BrandingLogFormValues } from '@/route-components/branding/forms/branding-log-form'
import { useCreateBrandingLog } from '@/route-components/branding/actions'
import { useBrandingGroupsStore } from '../store'

// ─── Config ──────────────────────────────────────────────────────────────────

const ICON_BY_TYPE = {
  manufacturing: <Scissors strokeWidth={1.2} className="size-4" />,
  warehouse:     <Boxes    strokeWidth={1.2} className="size-4" />,
}

// ─── Types ───────────────────────────────────────────────────────────────────

type ProductItem = {
  _id: string
  name: string
  color: string
  size: string
  quantity: number
  shipmentType: string
  materialProcessingType: string
}

type Props = {
  item: ProductItem
  completedQty: number
  defectQty: number
  brandingTaskId: string
  // Set only when this card renders a single split of the product within
  // an image group — lets handleSubmitLog attribute the log to that split.
  imageUrl?: string
  assignmentId?: string
}

// ─── ProductDescription ──────────────────────────────────────────────────────

type ProductDescriptionProps = {
  item: ProductItem
  completedQty: number
}

const Sep = () => (
  <Separator.Root
    orientation="vertical"
    decorative
    className="w-px my-auto bg-primary/20 data-[orientation=vertical]:h-10"
  />
)

const Cell = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex flex-col items-center justify-center gap-1 flex-1">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="text-sm font-medium text-primary text-center text-balance">{value}</div>
  </div>
)

const ProductDescription = ({ item, completedQty }: ProductDescriptionProps) => (
  <div className="flex items-stretch gap-2 w-full bg-muted/40 rounded-md p-2 mt-1">
    <Cell label="Розмір" value={item.size} />
    <Sep />
    <Cell label="Колір"  value={item.color} />
    <Sep />
    <Cell
      label="Виконано"
      value={
        <>
          {completedQty}
          <span className="text-muted-foreground font-normal"> / {item.quantity}</span>
        </>
      }
    />
  </div>
)

// ─── Component ───────────────────────────────────────────────────────────────

export const ProductItemCard = ({ item, completedQty, defectQty, brandingTaskId, imageUrl, assignmentId }: Props) => {
  const { openDialog, closeDialog } = useContext(DialogContext)
  const { mutate: createLog } = useCreateBrandingLog(closeDialog)
  const addAssignmentLocalComplete = useBrandingGroupsStore(s => s.addAssignmentLocalComplete)
  const localCompleteQty = useBrandingGroupsStore(s =>
    imageUrl && assignmentId
      ? s.assignmentsByOrder[brandingTaskId]?.[imageUrl]?.find(a => a.id === assignmentId)?.localCompleteQty
      : undefined
  )

  // Real completedQty is shared across all splits of this product — until the
  // split has its own confirmed logs (localCompleteQty), cap what this split
  // shows so unrelated splits' progress doesn't leak into its display.
  const displayCompletedQty = localCompleteQty !== undefined
    ? Math.min(completedQty, localCompleteQty)
    : completedQty

  const pct = item.quantity > 0 ? Math.min(100, Math.round((displayCompletedQty / item.quantity) * 100)) : 0
  const restQuantity = item.quantity - (localCompleteQty ?? completedQty)

  const handleSubmitLog = (values: BrandingLogFormValues) => {
    createLog({
      brandingTaskId:        brandingTaskId as Id<'brandingTasks'>,
      productionOrderItemId: item._id as Id<'productionOrderItems'>,
      type:     values.type,
      quantity: values.quantity,
      comment:  values.comment,
    })

    if (values.type === 'completed' && imageUrl && assignmentId)
      addAssignmentLocalComplete(brandingTaskId, imageUrl, assignmentId, values.quantity)
  }

  const handleAddLog = () => {
    openDialog({
      title: item.name,
      description: <ProductDescription item={item} completedQty={displayCompletedQty} />,
      outerClose: true,
      content: (
        <BrandingLogForm
          maxQuantity={restQuantity}
          actionSubmit={handleSubmitLog}
          />
        ),
    })
  }

  return (
    <div className="flex flex-col gap-2 px-3 py-2.5 rounded-lg border bg-card">

      {/* Name + add button */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="bg-muted rounded-md p-1 flex items-center justify-center shrink-0">
            {ICON_BY_TYPE[item.shipmentType as keyof typeof ICON_BY_TYPE] ?? <CircleQuestionMarkIcon className="size-4" />}
          </div>
          <div className="min-w-0">
            <div className="flex gap-1 items-center">
              <p className="text-sm font-medium leading-tight">{item.name}</p>
              {item.materialProcessingType && (
                <p className="text-xs font-light text-white leading-none bg-primary/20 rounded-md py-0.5 px-1">
                  {item.materialProcessingType}
                </p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{item.color} · {item.size}</p>
          </div>
        </div>
        <Button
          size="icon"
          variant="outline"
          className="size-7 shrink-0"
          onClick={handleAddLog}
        >
          <Plus className="size-3.5" />
        </Button>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Виконано: <b className="text-foreground">{displayCompletedQty}</b> / {item.quantity} шт</span>
        {defectQty > 0 && <span className="text-red-500">Брак: {defectQty}</span>}
        <span>{pct}%</span>
      </div>

      {/* Progress bar */}
      <ProgressBar done={displayCompletedQty} total={item.quantity} />
    </div>
  )
}
