import { useCallback, useContext } from 'react'
import { type HeaderObject } from 'simple-table-core'
import { type Id } from 'convex/_generated/dataModel'
import { Pencil, Scissors, Warehouse, Trash2, SquareSplitHorizontal } from 'lucide-react'
import { ActionsMenu } from '@/components/actions-menu'
import { DialogContext } from '@/contexts/dialog'
import {
  useUpdateOrderItemBrandingComment,
  useUpdateOrderItemSewingComment,
  useSplitOrderItem,
  useUpdateOrderItemDestination,
  useUpdateOrderItem,
} from '../actions'
import { type OrderItem, type BrandingTypeValue, BRANDING_LABELS } from '../types'
import { InlineEdit } from './inline-edit'
import { SplitItemForm } from '../forms/split-item-form'
import { EditItemForm } from '../forms/edit-item-form'

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

const destinationLabels: Record<string, { text: string, className: string }> = {
  customer:  { text: 'Клієнт', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'       },
  warehouse: { text: 'Склад',  className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  defects:   { text: 'Брак',   className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'           },
}

const DestinationCell = ({ row }: { row: Record<string, unknown> }) => {
  const item = row as OrderItem
  if (!item._id) return null
  const destination = item.destination ?? null
  if (!destination) return <span className="text-xs text-muted-foreground">-</span>
  const settings = destinationLabels[destination] ?? { text: destination, className: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300' }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs ${settings.className}`}>
      {settings.text}
    </span>
  )
}

const RowActionsCell = ({ row }: { row: Record<string, unknown> }) => {
  const item = row as OrderItem
  const { openDialog, closeDialog, setIsLoading } = useContext(DialogContext)
  const { mutateAsync: split }             = useSplitOrderItem()
  const { mutateAsync: updateDestination } = useUpdateOrderItemDestination()
  const { mutate: updateItem }             = useUpdateOrderItem()

  const cantSplit   = item.quantity <= 1
  const atWarehouse = item.destination === 'warehouse'

  const handleEdit = useCallback(() => {
    openDialog({
      title:   'Редагувати товар',
      content: (
        <EditItemForm
          item={item}
          onSubmit={(values) => {
            updateItem({ itemId: item._id as Id<'productionOrderItems'>, ...values })
            closeDialog()
          }}
        />
      ),
    })
  }, [item, openDialog, closeDialog, updateItem])

  const handleSplit = useCallback(() => {
    const id = openDialog({
      title:   'Розділити товар',
      content: (
        <SplitItemForm
          item={item}
          onSubmit={(splitQuantity) => {
            split({ itemId: item._id as Id<'productionOrderItems'>, splitQuantity })
            closeDialog(id)
          }}
        />
      ),
    })
  }, [item, openDialog, closeDialog, split])

  const handleMoveToWarehouse = useCallback(() => {
    const id = openDialog({
      title:        'Перемістити на склад',
      withForm:     true,
      outerClose:   true,
      content: (
        <p className="text-sm text-muted-foreground">
          Переміщення <span className="font-medium text-foreground">{item.name}</span> ({item.color} / {item.size}) на склад.
        </p>
      ),
      actionSubmit: () => {
        setIsLoading(true)
        updateDestination({ itemId: item._id as Id<'productionOrderItems'>, destination: 'warehouse' })
        setIsLoading(false)
        closeDialog(id)
      },
    })
  }, [item, openDialog, closeDialog, updateDestination, setIsLoading])

  if (!item._id) return null

  return (
    <ActionsMenu
      items={[
        { label: 'Редагувати',           icon: <Pencil                className="size-3" />, onClick: handleEdit },
        { label: 'Розділити',            icon: <SquareSplitHorizontal className="size-3" />, onClick: handleSplit,          disabled: cantSplit   },
        { label: 'Перемістити на склад', icon: <Warehouse             className="size-3" />, onClick: handleMoveToWarehouse, disabled: atWarehouse },
        { label: 'Видалити',             icon: <Trash2                className="size-3" />, onClick: () => {},             destructive: true     },
      ]}
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
    label:          'Звідки',
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
    width:          100,
    type:           'string',
    headerRenderer: renderHeader,
    cellRenderer:   CuttingBrandingCell,
  },
  {
    accessor:       'destination',
    label:          'Призначення',
    width:          150,
    minWidth:       100,
    type:           'string',
    headerRenderer: renderHeader,
    cellRenderer:   DestinationCell,
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
      const totalQyt = Array.isArray(row?.data) ? row.data.reduce((prev, cur) => prev + cur.quantity, 0) : 0;
      if (!name) return null
      return (
          <div className="flex items-center gap-2">
            <span className="text-xs wrap-break-word whitespace-normal">{name}</span>
            <span className="px-2 py-0.5 rounded-full border text-muted-foreground text-xs">
              {totalQyt}
            </span>
          </div>
      )
    },
  }
]
