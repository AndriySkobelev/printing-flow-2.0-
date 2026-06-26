import { useState, useMemo, useCallback, useContext, useRef, memo } from 'react'
import { type RowSelectionChangeProps } from 'simple-table-core'
import { type TableAPI } from '@simple-table/react'
import { type Id } from 'convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { values, pick, omit, groupBy } from 'ramda'
import AppTable from '@/components/ui/app-table'
import { DialogContext } from '@/contexts/dialog'
import { useUpdateSelectedOrderItemsBrandingType } from '../actions'
import { type OrderItem } from '../types'
import { itemHeaders } from './item-cells'
import { BulkBrandingForm } from '../forms/bulk-branding-form'
import clsx from 'clsx'

const combineGroupItems = (items: any) => {
  const arrayOfItems = values(items);
  const combine = arrayOfItems.map((el) => {
    let firstItem = pick(['name'], el[0]) as OrderItem;
    return {
      ...firstItem,
      data: el,
    }
  })

  return combine;
}

export const ProductGroup = memo(({ items }: { items: OrderItem[] }) => {
  const groupedItems = useMemo(() => groupBy(i => i.name, items), [items])
  const combineToTable = useMemo(() => combineGroupItems(groupedItems), [items])
  const tableRef = useRef<TableAPI>(null);
  const [tableKey, setTableKey] = useState(0)
  const nestedTableRef = useRef<TableAPI>(null);
  const { openDialog, closeDialog } = useContext(DialogContext)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const { mutateAsync: updateSelected } = useUpdateSelectedOrderItemsBrandingType()

  const handleSelectionChange = useCallback(({ selectedRows }: RowSelectionChangeProps) => {
    setSelectedIds(new Set(selectedRows))
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
    setTableKey(k => k + 1)
  }, [])

  const handleNestedSelect = useCallback(({ selectedRows, row }: RowSelectionChangeProps) => {
    const rowId = (row as OrderItem)._id
    const isSelected = [...selectedRows].some(id => id.includes(rowId))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (isSelected) {
        next.add(rowId)
      } else {
        next.delete(rowId)
      }
      return next
    })
  }, [])

  const handleConfigureSelected = useCallback(() => {
    const firstId = [...selectedIds][0]
    const firstItem = items.find(i => i._id === firstId)
    const id = openDialog({
      title: `Налаштувати вибрані (${selectedIds.size})`,
      content: (
        <BulkBrandingForm
          defaultValues={{
            brandingType:        firstItem?.brandingType        ?? [],
            cuttingBrandingType: firstItem?.cuttingBrandingType ?? [],
            brandingComment:     firstItem?.brandingComment     ?? '',
            sewingComment:       firstItem?.sewingComment       ?? '',
          }}
          onSubmit={({ brandingType, cuttingBrandingType, brandingComment, sewingComment }) => {
            updateSelected({
              itemIds: [...selectedIds] as Id<'productionOrderItems'>[],
              brandingType:        brandingType.length        ? brandingType        : undefined,
              cuttingBrandingType: cuttingBrandingType.length ? cuttingBrandingType : undefined,
              brandingComment:     brandingComment  || undefined,
              sewingComment:       sewingComment    || undefined,
            })
            closeDialog(id)
            clearSelection()
          }}
        />
      ),
    })
  }, [selectedIds, items, updateSelected, openDialog, closeDialog, clearSelection])

  return (
    <div className="flex flex-col gap-2">
      <div className="pl-0">
        <div className={
          clsx("flex items-center gap-2 px-2.5 py-1.5 mb-1.5 rounded-md bg-primary/5 border border-primary/20 opacity-30 transition-opacity",
            selectedIds.size > 0 && 'opacity-100'
          )
        }>
          <span className="flex-1 text-xs font-medium text-primary">
            {selectedIds.size} вибрано
          </span>
          <Button
            size="sm"
            type="button"
            variant="outline"
            onClick={handleConfigureSelected}
            className="h-6 text-[11px] px-2 border-primary/30 text-primary hover:bg-primary/10"
          >
            Налаштувати вибрані
          </Button>
        </div>
        <AppTable
          height={600}
          key={tableKey}
          ref={tableRef}
          hideHeader={true}
          expandAll={true}
          rows={combineToTable}
          rowGrouping={['data']}
          onRowSelectionChange={handleSelectionChange}
          getRowId={({ row }) => (row as OrderItem)._id}
          defaultHeaders={itemHeaders(nestedTableRef, handleNestedSelect)}
        />
      </div>
    </div>
  )
})
