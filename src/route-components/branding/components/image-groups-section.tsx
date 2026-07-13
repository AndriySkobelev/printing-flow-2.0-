import { useContext, useEffect, useMemo, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MyPopover } from '@/components/my-popover'
import { InputNumber } from '@/components/main-form/input-number'
import { DialogContext } from '@/contexts/dialog'
import { ProductItemCard } from './product-item-card'
import { type AttachedFile, isImage, getUrl, LightboxContent } from './images-section'
import { useBrandingGroupsStore, type ImageGroupAssignment, type AssignmentsByImage } from '../store'

type OrderItem = {
  _id: string
  name: string
  color: string
  size: string
  quantity: number
  shipmentType: string
  materialProcessingType: string
  completedQty: number
  defectQty: number
}

// Stable fallback references — a fresh `[]`/`{}` on every selector call would
// make zustand think the state changed on every render, causing an infinite
// update loop (see "getSnapshot should be cached" / "Maximum update depth").
const EMPTY_ASSIGNMENTS: ImageGroupAssignment[] = []
const EMPTY_ORDER_ASSIGNMENTS: Record<string, ImageGroupAssignment[]> = {}

// ─── AssignProductPopover ────────────────────────────────────────────────────

type AvailableProduct = OrderItem & { remaining: number }

type AssignProductPopoverProps = {
  products: AvailableProduct[]
  onAdd: (productId: string, quantity: number) => void
}

const AssignProductPopover = ({ products, onAdd }: AssignProductPopoverProps) => {
  const [productId, setProductId] = useState(products[0]?._id ?? '')
  const [quantity, setQuantity] = useState(1)

  useEffect(() => {
    if (!products.some(p => p._id === productId)) setProductId(products[0]?._id ?? '')
  }, [products, productId])

  useEffect(() => { setQuantity(1) }, [productId])

  if (products.length === 0) {
    return <p className="text-xs text-muted-foreground p-2 w-56">Усі товари вже розподілені</p>
  }

  const selected = products.find(p => p._id === productId)

  return (
    <div className="flex flex-col gap-2 p-1 w-56">
      <select
        value={productId}
        onChange={e => setProductId(e.target.value)}
        className="h-9 w-full rounded-md border bg-transparent px-2 text-sm outline-none"
      >
        {products.map(p => (
          <option key={p._id} value={p._id}>
            {p.name} · {p.color} · {p.size} ({p.remaining})
          </option>
        ))}
      </select>

      {selected && <InputNumber value={quantity} max={selected.remaining} onChange={setQuantity} />}

      <Button size="sm" className="w-full" disabled={!selected} onClick={() => selected && onAdd(selected._id, quantity)}>
        Додати
      </Button>
    </div>
  )
}

// ─── allocateByAssignment ───────────────────────────────────────────────────

type Allocation = { completedQty: number; defectQty: number }

// A product's real completedQty/defectQty is shared across all its splits —
// hand every split of a product the same real totals; ProductItemCard caps
// what it actually displays using that split's own localCompleteQty.
const allocateByAssignment = (
  allAssignments: AssignmentsByImage,
  orderItems: OrderItem[]
): Record<string, Allocation> => {
  const result: Record<string, Allocation> = {}
  for (const list of Object.values(allAssignments)) {
    for (const a of list) {
      const item = orderItems.find(i => i._id === a.productItemId)
      if (item) result[a.id] = { completedQty: item.completedQty, defectQty: item.defectQty }
    }
  }
  return result
}

// ─── ImageGroupCard ───────────────────────────────────────────────────────────

type ImageGroupCardProps = {
  orderId: string
  imageUrl: string
  imageIndex: number
  images: string[]
  orderItems: OrderItem[]
}

const ImageGroupCard = ({ orderId, imageUrl, imageIndex, images, orderItems }: ImageGroupCardProps) => {
  const { openDialog } = useContext(DialogContext)
  const assignments = useBrandingGroupsStore(s => s.assignmentsByOrder[orderId]?.[imageUrl] ?? EMPTY_ASSIGNMENTS)
  const allAssignments = useBrandingGroupsStore(s => s.assignmentsByOrder[orderId] ?? EMPTY_ORDER_ASSIGNMENTS)
  const addAssignment = useBrandingGroupsStore(s => s.addAssignment)
  const removeAssignment = useBrandingGroupsStore(s => s.removeAssignment)

  const assignedByProduct = useMemo(() => {
    const map: Record<string, number> = {}
    for (const list of Object.values(allAssignments)) {
      for (const a of list) map[a.productItemId] = (map[a.productItemId] ?? 0) + a.quantity
    }
    return map
  }, [allAssignments])

  const availableProducts = useMemo(
    () => orderItems
      .map(item => ({ ...item, remaining: item.quantity - (assignedByProduct[item._id] ?? 0) }))
      .filter(item => item.remaining > 0),
    [orderItems, assignedByProduct]
  )

  const allocations = useMemo(() => allocateByAssignment(allAssignments, orderItems), [allAssignments, orderItems])

  const handleZoom = () => openDialog({
    outerClose: true,
    className:  'max-w-none w-fit bg-transparent border-none shadow-none p-4 flex flex-col items-center gap-4',
    content:    <LightboxContent images={images} startIndex={imageIndex} />,
  })

  return (
    <div className="flex gap-3 p-2 rounded-lg border bg-card">
      <button onClick={handleZoom} className="relative shrink-0 size-24 overflow-hidden rounded-md border bg-muted">
        <img src={imageUrl} alt="" decoding="async" className="w-full h-full object-cover" />
      </button>

      <div className="flex-1 flex flex-col gap-1.5 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-muted-foreground">Товари для цього зображення</span>
          <MyPopover
            align="end"
            trigger={
              <Button size="icon" variant="outline" className="size-6 shrink-0">
                <Plus className="size-3.5" />
              </Button>
            }
            content={<AssignProductPopover products={availableProducts} onAdd={(productId, quantity) => addAssignment(orderId, imageUrl, productId, quantity)} />}
          />
        </div>

        {assignments.length === 0 ? (
          <p className="text-xs text-muted-foreground">Немає доданих товарів</p>
        ) : (
          <div className="flex gap-2">
            {assignments.map(a => {
              const item = orderItems.find(i => i._id === a.productItemId)
              if (!item) return null
              const alloc = allocations[a.id] ?? { completedQty: 0, defectQty: 0 }
              return (
                <div key={a.id} className="relative">
                  <button
                    onClick={() => removeAssignment(orderId, imageUrl, a.id)}
                    className="absolute -top-2 -right-2 z-10 flex items-center justify-center size-5 rounded-full bg-red-500 text-white shadow hover:bg-red-600 transition-colors"
                  >
                    <X className="size-3" />
                  </button>
                  {/* Same card as the default Products section (same real "+"
                     branding-log action), scoped to this image's split
                     quantity and its allocated share of the real progress. */}
                  <ProductItemCard
                    item={{ ...item, quantity: a.quantity }}
                    completedQty={alloc.completedQty}
                    defectQty={alloc.defectQty}
                    brandingTaskId={orderId}
                    imageUrl={imageUrl}
                    assignmentId={a.id}
                  />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── ImageGroupsSection ───────────────────────────────────────────────────────

type Props = {
  orderId: string
  files: AttachedFile[]
  orderItems: OrderItem[]
}

export const ImageGroupsSection = ({ orderId, files, orderItems }: Props) => {
  const images = useMemo(() => files.filter(isImage), [files])
  const imageUrls = useMemo(() => images.map(getUrl), [images])
  const allAssignments = useBrandingGroupsStore(s => s.assignmentsByOrder[orderId] ?? EMPTY_ORDER_ASSIGNMENTS)

  // A group is done once every split assigned to its image has reached its
  // quantity (same real-completed-capped-by-localComplete rule ProductItemCard
  // uses to decide what it displays). Groups with nothing assigned yet stay put.
  const isGroupDone = (url: string) => {
    const list = allAssignments[url] ?? []
    return list.length > 0 && list.every(a => {
      const item = orderItems.find(i => i._id === a.productItemId)
      return !!item && Math.min(item.completedQty, a.localCompleteQty) >= a.quantity
    })
  }

  const sortedEntries = useMemo(
    () => imageUrls
      .map((url, index) => ({ url, index }))
      .sort((a, b) => Number(isGroupDone(a.url)) - Number(isGroupDone(b.url))),
    [imageUrls, allAssignments, orderItems]
  )

  if (imageUrls.length === 0) {
    return (
      <section className="px-3 pb-4">
        <p className="text-sm text-muted-foreground">Немає зображень для розподілу</p>
      </section>
    )
  }

  return (
    <section className="px-3 pb-4 flex flex-col gap-2">
      {sortedEntries.map(({ url, index }) => (
        <ImageGroupCard
          key={`${url}-${index}`}
          orderId={orderId}
          imageUrl={url}
          imageIndex={index}
          images={imageUrls}
          orderItems={orderItems}
        />
      ))}
    </section>
  )
}
