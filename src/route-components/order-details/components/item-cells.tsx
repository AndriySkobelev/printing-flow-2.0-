import { useCallback } from 'react'
import { type HeaderObject } from 'simple-table-core'
import { type Id } from 'convex/_generated/dataModel'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MyPopover } from '@/components/my-popover'
import {
  useUpdateOrderItemBrandingType,
  useUpdateOrderItemCuttingBrandingType,
  useUpdateOrderItemBrandingComment,
  useUpdateOrderItemSewingComment,
} from '../actions'
import { type OrderItem, type BrandingTypeValue, BRANDING_LABELS } from '../types'
import { InlineEdit } from './inline-edit'
import { BrandingSection } from './branding-section'

// ─── Cells ────────────────────────────────────────────────────────────────────

const ShipmentTypeCell = ({ row }: { row: Record<string, unknown> }) => {
  const item = row as OrderItem
  if (!item.shipmentType) return null
  if (item.shipmentType === 'manufacturing')
    return <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-xs">Виробництво</span>
  if (item.shipmentType === 'warehouse')
    return <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-xs">Склад</span>
  return null
}

const BrandingCommentCell = ({ row }: { row: Record<string, unknown> }) => {
  const item = row as OrderItem
  const { mutate: updateComment } = useUpdateOrderItemBrandingComment()
  const handleSave = useCallback((val: string) =>
    updateComment({ itemId: item._id as Id<'productionOrderItems'>, brandingComment: val || undefined }),
    [item._id, updateComment]
  )
  if (!item._id) return null
  return <InlineEdit value={item.brandingComment ?? ''} onSave={handleSave} placeholder="Коментар брендування…" />
}

const SewingCommentCell = ({ row }: { row: Record<string, unknown> }) => {
  const item = row as OrderItem
  const { mutate: updateComment } = useUpdateOrderItemSewingComment()
  const handleSave = useCallback((val: string) =>
    updateComment({ itemId: item._id as Id<'productionOrderItems'>, sewingComment: val || undefined }),
    [item._id, updateComment]
  )
  if (!item._id) return null
  return <InlineEdit value={item.sewingComment ?? ''} onSave={handleSave} placeholder="Коментар пошиву…" />
}

const BrandingCell = ({ row }: { row: Record<string, unknown> }) => {
  const item = row as OrderItem
  if (!item._id) return null
  const types = item.brandingType ?? []
  if (!types.length) return '-'
  return (
    <div className="flex flex-wrap gap-1">
      {types.map(t => (
        <span key={t} className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-medium">
          {BRANDING_LABELS[t]}
        </span>
      ))}
    </div>
  )
}

const CuttingBrandingCell = ({ row }: { row: Record<string, unknown> }) => {
  const item = row as OrderItem
  if (!item._id) return null
  const types = item.cuttingBrandingType ?? []
  if (!types.length) return '-'
  return (
    <div className="flex flex-wrap gap-1">
      {types.map(t => (
        <span key={t} className="px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 text-[11px] font-medium">
          {BRANDING_LABELS[t]}
        </span>
      ))}
    </div>
  )
}

const RowActionsCell = ({ row }: { row: Record<string, unknown> }) => {
  const item = row as OrderItem
  if (!item._id) return null
  const { mutate: updateBrandingType }        = useUpdateOrderItemBrandingType()
  const { mutate: updateCuttingBrandingType } = useUpdateOrderItemCuttingBrandingType()

  const readyTypes   = item.brandingType        ?? []
  const cuttingTypes = item.cuttingBrandingType ?? []

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

  return (
    <MyPopover
      align="end"
      trigger={
        <Button variant="ghost" size="icon" className="size-5 text-muted-foreground hover:text-foreground">
          <Pencil className="size-3" />
        </Button>
      }
      content={
        <div className="flex flex-col gap-3 p-1 min-w-42.5">
          <BrandingSection label="На готовому" active={readyTypes}   onToggle={handleToggleReady} />
          <BrandingSection label="На кроях"    active={cuttingTypes} onToggle={handleToggleCutting} />
        </div>
      }
    />
  )
}

// ─── Headers ──────────────────────────────────────────────────────────────────

const renderHeader = ({ header }: { header: HeaderObject }) => (
  <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/50 px-2">
    {header.label}
  </span>
)

export const itemNestedHeaders: HeaderObject[] = [
  {
    accessor:       'color',
    label:          'Розмір / Колір',
    width:          150,
    minWidth:       70,
    type:           'string',
    headerRenderer: renderHeader,
    cellRenderer:   ({ row }) => {
      const { color, size} = (row as OrderItem)
      if (!color) return null
      return (
        <div className='flex items-center gap-2'>
           <span className="px-2 py-0.5 rounded-full border text-muted-foreground text-xs">
            {size}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs">
            {color}
          </span>
        </div>
      )
    },
  },
  {
    accessor:       'quantity',
    label:          'Кіл.',
    width:          70,
    minWidth:       50,
    type:           'number',
    headerRenderer: renderHeader,
    cellRenderer:   ({ row }) => {
      const qty = (row as OrderItem).quantity
      if (qty == null) return null
      return <span className="text-xs tabular-nums">{qty}</span>
    },
  },
  {
    accessor:       'shipmentType',
    label:          'Тип',
    width:          110,
    minWidth:       80,
    type:           'string',
    headerRenderer: renderHeader,
    cellRenderer:   ShipmentTypeCell,
  },
  {
    accessor:       'brandingComment',
    label:          'Коментар (брендування)',
    width:          180,
    minWidth:       100,
    type:           'string',
    headerRenderer: renderHeader,
    cellRenderer:   BrandingCommentCell,
  },
  {
    accessor:       'sewingComment',
    label:          'Коментар (пошив)',
    width:          180,
    minWidth:       100,
    type:           'string',
    headerRenderer: renderHeader,
    cellRenderer:   SewingCommentCell,
  },
  {
    accessor:       'brandingType',
    label:          'На готовому',
    width:          150,
    minWidth:       100,
    type:           'string',
    headerRenderer: renderHeader,
    cellRenderer:   BrandingCell,
  },
  {
    accessor:       'cuttingBrandingType',
    label:          'На кроях',
    width:          150,
    minWidth:       100,
    type:           'string',
    headerRenderer: renderHeader,
    cellRenderer:   CuttingBrandingCell,
  },
  {
    accessor:       '_actions',
    label:          '',
    width:          40,
    minWidth:       40,
    type:           'string',
    headerRenderer: renderHeader,
    cellRenderer:   RowActionsCell,
  },
]

export const itemHeaders: (nestedRef: any, nestedSelectRows: any) => HeaderObject[] = (nestedRef: any, nestedSelectRows) => [
  {
    accessor:       'name',
    label:          'Виріб',
    width:          '100%',
    minWidth:       70,
    type:           'string',
    expandable:       true,
    headerRenderer: renderHeader,
    nestedTable: {
      tableRef: nestedRef,
      enableRowSelection: true,
      defaultHeaders: itemNestedHeaders,
      onRowSelectionChange: nestedSelectRows,
      hideFooter: true,
      getRowId: ({ row }) => (row as OrderItem)._id
    },
    cellRenderer:   ({ row }) => {
      const name = (row as OrderItem).name
      if (!name) return null
      return <span className="text-xs wrap-break-word whitespace-normal">{name}</span>
    },
  }
]
