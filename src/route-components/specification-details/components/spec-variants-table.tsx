import { useMemo, useState, useCallback, useContext } from 'react'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from 'convex/_generated/api'
import { type Id } from 'convex/_generated/dataModel'
import { type HeaderObject, type CellClickProps, type RowSelectionChangeProps } from 'simple-table-core'
import { Check, Plus, SquarePen } from 'lucide-react'
import AppTable from '@/components/ui/app-table'
import { Button } from '@/components/ui/button'
import { productSizes } from '@/constants'
import { DialogContext } from '@/contexts/dialog'
import { useCreateSpecVariants, useBulkUpdateProductMaterials } from '../actions'
import EditMaterialsForm, { type EditMaterialsFormType } from '../forms/edit-materials-form'
import VariantDetailContent from './variant-detail-content'
import { ColorFilterMenu } from './color-filter-menu'

type Props = {
  specificationId: string
}

const CheckCell = ({ onContextMenu }: { onContextMenu?: (e: React.MouseEvent) => void }) => (
  <span className="flex items-center justify-center w-full h-full" onContextMenu={onContextMenu}>
    <Check size={14} className="text-green-500" />
  </span>
)

const SelectedCheckCell = ({ onContextMenu }: { onContextMenu?: (e: React.MouseEvent) => void }) => (
  <span className="flex items-center justify-center bg-blue-50 w-full h-full rounded-sm" onContextMenu={onContextMenu}>
    <Check size={14} className="text-blue-500" />
  </span>
)

const PlusCell = () => (
  <span className="flex items-center justify-center"><Plus size={14} className="text-blue-500" /></span>
)

const EmptyCell = () => (
  <span className="flex items-center justify-center opacity-15 hover:opacity-50 transition-opacity cursor-pointer">
    <Plus size={14} />
  </span>
)


export const SpecVariantsTable = ({ specificationId }: Props) => {
  const { data: products = [], isLoading: loadingProducts } = useQuery(
    convexQuery(api.queries.products.getProductsBySpec, {
      specificationId: specificationId as Id<'specifications'>,
    })
  )
  const { data: fabricColors = [], isLoading: loadingColors } = useQuery(
    convexQuery(api.queries.products.getSpecBaseFabricColors, {
      specificationId: specificationId as Id<'specifications'>,
    })
  )
  const { mutate: createVariants, isPending } = useCreateSpecVariants()
  const { mutate: bulkUpdateMaterials } = useBulkUpdateProductMaterials()
  const { openDialog, closeDialog } = useContext(DialogContext)

  const [pending, setPending] = useState<Set<string>>(new Set())
  const [selectedVariants, setSelectedVariants] = useState<Set<string>>(new Set())
  const [colorFilter, setColorFilter] = useState<string[]>([])
  // simple-table-core tracks its own row-selection (checkbox) state internally —
  // bumping this key remounts the table so that state resets along with ours.
  const [tableKey, setTableKey] = useState(0)

  const isLoading = loadingProducts || loadingColors

  const colorNames = useMemo(() => fabricColors.map(f => f.color), [fabricColors])

  const { variantSet, rows } = useMemo(() => {
    const variantSet = new Set<string>()
    for (const p of products) variantSet.add(`${p.color}__${p.size}`)

    const rows = fabricColors
      .filter(f => colorFilter.length === 0 || colorFilter.includes(f.color))
      .map(f => {
        const row: Record<string, any> = { color: f.color }
        for (const size of productSizes) {
          const key = `${f.color}__${size}`
          row[`__status_${size}`] = variantSet.has(key)
            ? selectedVariants.has(key) ? 'selected' : 'exists'
            : pending.has(key) ? 'pending' : 'none'
        }
        return row
      })

    return { variantSet, rows }
  }, [products, fabricColors, pending, selectedVariants, colorFilter])

  const selectedProductIds = useMemo(
    () => products.filter(p => selectedVariants.has(`${p.color}__${p.size}`)).map(p => p._id),
    [products, selectedVariants]
  )

  const handleCellClick = useCallback(({ accessor, row }: CellClickProps) => {
    if (!productSizes.includes(accessor as string)) return
    const key = `${(row as any).color}__${accessor}`
    if (variantSet.has(key)) {
      setSelectedVariants(prev => {
        const next = new Set(prev)
        next.has(key) ? next.delete(key) : next.add(key)
        return next
      })
    } else {
      setPending(prev => {
        const next = new Set(prev)
        next.has(key) ? next.delete(key) : next.add(key)
        return next
      })
    }
  }, [variantSet])

  const handleCellContextMenu = useCallback((e: React.MouseEvent, color: string, size: string) => {
    e.preventDefault()
    const product = products.find(p => p.color === color && p.size === size)
    if (!product) return
    openDialog({
      title: `${color} · ${size}`,
      content: <VariantDetailContent productId={product._id} />,
    })
  }, [products, openDialog])

  // Toggle every row's cell in this size column at once. If every cell in the
  // column is already active (selected/pending), the click clears them all —
  // otherwise it activates whichever ones aren't active yet.
  const handleColumnSelect = useCallback((size: string) => {
    const keys = rows.map(r => `${(r as any).color}__${size}`)
    const allActive = keys.every(key => variantSet.has(key) ? selectedVariants.has(key) : pending.has(key))

    setPending(prev => {
      const next = new Set(prev)
      for (const key of keys) {
        if (!variantSet.has(key)) allActive ? next.delete(key) : next.add(key)
      }
      return next
    })
    setSelectedVariants(prev => {
      const next = new Set(prev)
      for (const key of keys) {
        if (variantSet.has(key)) allActive ? next.delete(key) : next.add(key)
      }
      return next
    })
  }, [rows, variantSet, selectedVariants, pending])

  const tableHeaders: HeaderObject[] = useMemo(() => [
    {
      accessor: 'color',
      label: '',
      width: 140,
      type: 'string',
      pinned: 'left',
    },
    ...productSizes.map(size => ({
      accessor: size,
      label: size,
      width: 58,
      type: 'other' as const,
      headerRenderer: () => (
        <button
          type="button"
          onClick={() => handleColumnSelect(size)}
          className="w-full text-center text-xs font-medium hover:text-primary transition-colors cursor-pointer"
          title={`Вибрати колонку ${size}`}
        >
          {size}
        </button>
      ),
      cellRenderer: ({ row }: { row: Record<string, any> }) => {
        const status = row[`__status_${size}`]
        const color = row.color
        const onContextMenu = (e: React.MouseEvent) => handleCellContextMenu(e, color, size)
        if (status === 'selected') return <SelectedCheckCell onContextMenu={onContextMenu} />
        if (status === 'exists') return <CheckCell onContextMenu={onContextMenu} />
        if (status === 'pending') return <PlusCell />
        return <EmptyCell />
      },
    })),
  ], [rows, handleCellContextMenu, handleColumnSelect])

  const handleRowSelection = useCallback(({ row, isSelected }: RowSelectionChangeProps) => {
    const color = (row as any).color
    setPending(prev => {
      const next = new Set(prev)
      for (const size of productSizes) {
        const key = `${color}__${size}`
        if (!variantSet.has(key)) {
          isSelected ? next.add(key) : next.delete(key)
        }
      }
      return next
    })
    setSelectedVariants(prev => {
      const next = new Set(prev)
      for (const size of productSizes) {
        const key = `${color}__${size}`
        if (variantSet.has(key)) {
          isSelected ? next.add(key) : next.delete(key)
        }
      }
      return next
    })
  }, [variantSet])

  const handleEditMaterials = useCallback(() => {
    const formId = 'edit-materials-form'
    openDialog({
      title: 'Редагувати матеріали',
      withForm: true,
      formId,
      content: (
        <EditMaterialsForm
          formId={formId}
          specificationId={specificationId as Id<'specifications'>}
          actionSubmit={({ updates }: EditMaterialsFormType) => {
            bulkUpdateMaterials(
              { productIds: selectedProductIds as Id<'products'>[], updates },
              { onSuccess: () => closeDialog() }
            )
          }}
        />
      ),
    })
  }, [specificationId, selectedProductIds, openDialog, closeDialog, bulkUpdateMaterials])

  const handleCreate = () => {
    const variants = Array.from(pending).map(key => {
      const [color, size] = key.split('__')
      return { color, size }
    })
    createVariants(
      { specificationId: specificationId as Id<'specifications'>, variants },
      {
        onSuccess: () => {
          setPending(new Set())
          setSelectedVariants(new Set())
          setTableKey(k => k + 1)
        },
      }
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2.5 border-b shrink-0 flex items-center justify-between gap-2">
        <div className='flex items-center gap-2'>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground shrink-0">
            Варіанти ({products.length})
          </p>
          <ColorFilterMenu colors={colorNames} selected={colorFilter} onChange={setColorFilter} />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {selectedProductIds.length > 0 && (
            <Button size="sm" variant="outline" className="h-6 text-[11px] px-2" onClick={handleEditMaterials}>
              <SquarePen size={10} className="mr-1" />
              Оновити матеріали ({selectedProductIds.length})
            </Button>
          )}
          <Button size="sm" className="h-6 text-[11px] px-2" onClick={handleCreate} disabled={pending.size <= 0 || isPending}>
            <Plus size={10} className="mr-1" />
            Створити ({pending.size})
          </Button>
        </div>
      </div>
      <AppTable
        key={tableKey}
        rows={rows}
        defaultHeaders={tableHeaders}
        isLoading={isLoading}
        getRowId={({ row }: any) => row.color as string}
        height="100%"
        enableRowSelection
        onRowSelectionChange={handleRowSelection}
        onCellClick={handleCellClick}
      />
    </div>
  )
}
