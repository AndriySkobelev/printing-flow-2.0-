import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from 'convex/_generated/api'
import { type Id } from 'convex/_generated/dataModel'
import {
  useUpdateOrderItemBrandingType,
  useUpdateOrderItemCuttingBrandingType,
  useUpdateAllOrderItemsBrandingType,
  useUpdateOrderItemComment,
} from '../actions'
import { ArrowLeft, Truck, Scissors, Package, Palette, Wand2, Pencil, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ImagesSection } from '@/route-components/branding/components/images-section'
import { MyPopover } from '@/components/my-popover'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type BrandingTypeValue = 'dtf' | 'dtg' | 'flok' | 'embroidery' | 'sublimation'

const BRANDING_TYPES: BrandingTypeValue[] = ['dtf', 'dtg', 'flok', 'embroidery', 'sublimation']

const BRANDING_LABELS: Record<BrandingTypeValue, string> = {
  dtf:         'DTF',
  dtg:         'DTG',
  flok:        'Флок',
  embroidery:  'Вишивка',
  sublimation: 'Субліма',
}

type OrderItem = {
  _id: string
  name: string
  color: string
  size: string
  quantity: number
  keycrmProductComment?: string | null
  comment?: string | null
  shipmentType?: 'manufacturing' | 'warehouse' | null
  brandingType?: BrandingTypeValue[] | null
  cuttingBrandingType?: BrandingTypeValue[] | null
}

export type Props = {
  productionOrderId: string | null
  onBack?: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (ts: number) =>
  new Date(ts).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: '2-digit' })

// ─── InlineEdit ───────────────────────────────────────────────────────────────

const InlineEdit = memo(({ value, onSave, placeholder = '…' }: {
  value: string
  onSave: (val: string) => void
  placeholder?: string
}) => {
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setDraft(value) }, [value])
  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  const save   = useCallback(() => { onSave(draft.trim()); setEditing(false) }, [draft, onSave])
  const cancel = useCallback(() => { setDraft(value); setEditing(false) }, [value])

  return (
    <span className="flex-1 min-w-0 cursor-text" onClick={() => { if (!editing) setEditing(true) }}>
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={e => {
            if (e.key === 'Enter')  { e.preventDefault(); save() }
            if (e.key === 'Escape') cancel()
          }}
          className="w-full bg-transparent outline-none border-b border-border text-xs text-foreground"
          placeholder={placeholder}
        />
      ) : (
        <span className={cn(
          'block truncate text-xs',
          draft ? 'text-foreground' : 'text-muted-foreground/40 italic'
        )}>
          {draft || placeholder}
        </span>
      )}
    </span>
  )
})

// ─── ProgressStat ─────────────────────────────────────────────────────────────

const ProgressStat = memo(({ label, done, total, color, icon }: {
  label: string
  done: number
  total: number
  color: string
  icon: React.ReactNode
}) => {
  if (total === 0) return null
  const pct = Math.min(100, Math.round((done / total) * 100))
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          {icon}
          {label}
        </span>
        <span className="tabular-nums font-medium">{done}/{total}</span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-border overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  )
})

// ─── BrandingSection ─────────────────────────────────────────────────────────

const BrandingSection = memo(({ label, active, onToggle }: {
  label: string
  active: BrandingTypeValue[]
  onToggle: (type: BrandingTypeValue) => void
}) => (
  <div className="flex flex-col gap-1.5">
    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
    <div className="flex flex-wrap gap-1">
      {BRANDING_TYPES.map(type => (
        <button
          key={type}
          onClick={() => onToggle(type)}
          className={cn(
            'px-2 py-0.5 rounded-full text-[11px] font-medium border transition-colors',
            active.includes(type)
              ? 'bg-primary text-primary-foreground border-primary'
              : 'border-border text-muted-foreground hover:bg-muted'
          )}
        >
          {BRANDING_LABELS[type]}
        </button>
      ))}
    </div>
  </div>
))

// ─── ProductCard ──────────────────────────────────────────────────────────────

const ProductCard = memo(({ item }: { item: OrderItem }) => {
  const { mutate: updateBrandingType }        = useUpdateOrderItemBrandingType()
  const { mutate: updateCuttingBrandingType } = useUpdateOrderItemCuttingBrandingType()
  const { mutate: updateComment }             = useUpdateOrderItemComment()

  const readyTypes   = item.brandingType   ?? []
  const cuttingTypes = item.cuttingBrandingType ?? []

  const brandingSummary = useMemo(() => [
    readyTypes.length   > 0 && readyTypes.map(t => BRANDING_LABELS[t]).join(', '),
    cuttingTypes.length > 0 && `крої: ${cuttingTypes.map(t => BRANDING_LABELS[t]).join(', ')}`,
  ].filter(Boolean).join(' · ') || null, [readyTypes, cuttingTypes])

  const toggle = useCallback((
    current: BrandingTypeValue[],
    type: BrandingTypeValue,
    save: (next: BrandingTypeValue[] | undefined) => void
  ) => {
    const next = current.includes(type) ? current.filter(t => t !== type) : [...current, type]
    save(next.length ? next : undefined)
  }, [])

  const handleToggleReady = useCallback((type: BrandingTypeValue) =>
    toggle(readyTypes, type, val =>
      updateBrandingType({ itemId: item._id as Id<'productionOrderItems'>, brandingType: val })
    ), [readyTypes, item._id, updateBrandingType, toggle])

  const handleToggleCutting = useCallback((type: BrandingTypeValue) =>
    toggle(cuttingTypes, type, val =>
      updateCuttingBrandingType({ itemId: item._id as Id<'productionOrderItems'>, cuttingBrandingType: val })
    ), [cuttingTypes, item._id, updateCuttingBrandingType, toggle])

  const handleSaveComment = useCallback((val: string) =>
    updateComment({ itemId: item._id as Id<'productionOrderItems'>, comment: val || undefined }),
    [item._id, updateComment])

  const popoverContent = useMemo(() => (
    <div className="flex flex-col gap-3 p-1 min-w-42.5">
      <BrandingSection label="На готовому" active={readyTypes}   onToggle={handleToggleReady} />
      <BrandingSection label="На кроях"    active={cuttingTypes} onToggle={handleToggleCutting} />
    </div>
  ), [readyTypes, cuttingTypes, handleToggleReady, handleToggleCutting])

  return (
    <div className="flex items-center gap-2 rounded-lg border px-2.5 py-2 bg-background text-xs">
      <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground shrink-0">
        {item.color}
      </span>
      <span className="px-2 py-0.5 rounded-full border text-muted-foreground shrink-0">
        {item.size}
      </span>
      {item.shipmentType === 'manufacturing' && (
        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 shrink-0">
          Виробництво
        </span>
      )}
      {item.shipmentType === 'warehouse' && (
        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 shrink-0">
          Склад
        </span>
      )}

      <InlineEdit value={item.comment ?? ''} onSave={handleSaveComment} placeholder="Коментар…" />

      <span className={cn(
        'shrink-0 truncate max-w-[160px]',
        brandingSummary ? 'text-foreground' : 'text-muted-foreground/40 italic'
      )}>
        {brandingSummary ?? '—'}
      </span>

      <span className="tabular-nums font-semibold text-muted-foreground shrink-0">
        {item.quantity} шт
      </span>

      <MyPopover
        align="end"
        trigger={
          <Button variant="ghost" size="icon" className="size-5 shrink-0 text-muted-foreground hover:text-foreground">
            <Pencil className="size-3" />
          </Button>
        }
        content={popoverContent}
      />
    </div>
  )
})

// ─── ProductGroup ─────────────────────────────────────────────────────────────

const ProductGroup = memo(({ name, items }: { name: string; items: OrderItem[] }) => {
  const [expanded, setExpanded] = useState(true)
  const totalQty = useMemo(() => items.reduce((s, i) => s + i.quantity, 0), [items])

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={() => setExpanded(prev => !prev)}
        className="flex items-center gap-1.5 w-full text-left py-0.5 group"
      >
        <ChevronDown
          size={12}
          className={cn('text-muted-foreground transition-transform shrink-0', !expanded && '-rotate-90')}
        />
        <span className="flex-1 text-xs font-semibold truncate min-w-0 group-hover:text-foreground transition-colors">
          {name}
        </span>
        {items.length > 1 && (
          <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
            {items.length} варіанти
          </span>
        )}
        <span className="text-xs font-medium tabular-nums text-muted-foreground shrink-0 ml-2">
          {totalQty} шт
        </span>
      </button>

      {expanded && (
        <div className="flex flex-col gap-1 pl-4.5">
          <div className="flex items-center gap-2 px-2.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/50 select-none">
            <span className="flex-1">Коментар</span>
            <span className="shrink-0 w-[160px]">Брендування</span>
            <span className="shrink-0 w-[34px] text-right">Кіл.</span>
            <span className="size-5 shrink-0" />
          </div>
          {items.map(item => (
            <ProductCard key={item._id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
})

// ─── ProductsSection ──────────────────────────────────────────────────────────

const ProductsSection = ({ items, productionOrderId }: { items: OrderItem[]; productionOrderId: string }) => {
  const { mutate: updateAll } = useUpdateAllOrderItemsBrandingType()
  const [bulkReady,   setBulkReady]   = useState<BrandingTypeValue[]>([])
  const [bulkCutting, setBulkCutting] = useState<BrandingTypeValue[]>([])

  const toggleBulk = useCallback((
    set: React.Dispatch<React.SetStateAction<BrandingTypeValue[]>>,
    type: BrandingTypeValue
  ) => set(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]), [])

  const applyToAll = useCallback(() =>
    updateAll({
      productionOrderId:   productionOrderId as Id<'productionOrders'>,
      brandingType:        bulkReady.length   ? bulkReady   : undefined,
      cuttingBrandingType: bulkCutting.length ? bulkCutting : undefined,
    }), [productionOrderId, bulkReady, bulkCutting, updateAll])

  const groups = useMemo(() =>
    items.reduce<Map<string, OrderItem[]>>((map, item) => {
      const arr = map.get(item.name) ?? []
      arr.push(item)
      map.set(item.name, arr)
      return map
    }, new Map()),
  [items])

  return (
    <section className="p-3 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Товари ({items.length})
        </p>
        <MyPopover
          align="end"
          trigger={
            <Button size="sm" variant="outline" className="h-6 text-[11px] px-2">
              Налаштувати всі
            </Button>
          }
          content={
            <div className="flex flex-col gap-3 p-1 min-w-42.5">
              <BrandingSection
                label="На готовому"
                active={bulkReady}
                onToggle={type => toggleBulk(setBulkReady, type)}
              />
              <BrandingSection
                label="На кроях"
                active={bulkCutting}
                onToggle={type => toggleBulk(setBulkCutting, type)}
              />
              <Button size="sm" onClick={applyToAll} className="h-7 text-xs w-full mt-1">
                Застосувати до всіх
              </Button>
            </div>
          }
        />
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Немає товарів</p>
      ) : (
        <div className="flex flex-col divide-y">
          {Array.from(groups.entries()).map(([name, groupItems]) => (
            <div key={name} className="py-2.5 first:pt-0 last:pb-0">
              <ProductGroup name={name} items={groupItems} />
            </div>
          ))}
        </div>
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
      <div className="w-80 shrink-0 border-r flex flex-col">

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
            <ProgressStat
              label="Розкрій"
              done={order.cutDone}
              total={order.cutTotal}
              color="#0ea5e9"
              icon={<Scissors size={11} />}
            />
            <ProgressStat
              label="Пошив"
              done={order.sewDone}
              total={order.sewTotal}
              color="#8b5cf6"
              icon={<Wand2 size={11} />}
            />
            <ProgressStat
              label="Брендування"
              done={order.brandingDone}
              total={order.brandingTotal}
              color="#f59e0b"
              icon={<Palette size={11} />}
            />
            <ProgressStat
              label="Пакування"
              done={order.packingDone}
              total={order.packingTotal}
              color="#10b981"
              icon={<Package size={11} />}
            />
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
