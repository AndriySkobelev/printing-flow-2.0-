import { useMemo, useRef, useState, useCallback, useContext } from 'react'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from 'convex/_generated/api'
import { type Id } from 'convex/_generated/dataModel'
import { type HeaderObject, type CellClickProps } from 'simple-table-core'
import { Check, CheckCheck, Info, Plus, SquarePen } from 'lucide-react'
import AppTable from '@/components/ui/app-table'
import { Button } from '@/components/ui/button'
import { productSizes } from '@/constants'
import { DialogContext } from '@/contexts/dialog'
import { useCreateSpecVariants, useBulkUpdateProductMaterials } from '../actions'
import EditMaterialsForm, { type EditMaterialsFormType } from '../forms/edit-materials-form'
import VariantDetailContent from './variant-detail-content'
import { FilterMenu } from '@/components/filter-menu'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/check-box'
import { cn } from '@/lib/utils'

type Props = {
  specificationId: string
}

const CheckCell = ({ migrated }: { migrated?: boolean }) => (
  <span className="flex items-center justify-center w-full h-full" title={migrated ? 'Змігровано в KeyCRM' : undefined}>
    {migrated ? <CheckCheck size={14} className="text-green-500" /> : <Check size={14} className="text-green-500" />}
  </span>
)

const SelectedCheckCell = ({ migrated }: { migrated?: boolean }) => (
  <span className="flex items-center justify-center bg-blue-50 w-full h-full rounded-sm" title={migrated ? 'Змігровано в KeyCRM' : undefined}>
    {migrated ? <CheckCheck size={14} className="text-blue-500" /> : <Check size={14} className="text-blue-500" />}
  </span>
)

const PlusCell = () => (
  <span className="flex items-center justify-center"><Plus size={14} className="text-blue-500" /></span>
)

const EmptyCell = () => (
  <span className="flex items-center justify-center opacity-15 hover:opacity-50 transition-opacity cursor-pointer group-data-[mode=edit]/variants:invisible">
    <Plus size={14} />
  </span>
)

// Creating fills in missing sizes; editing picks existing variants for
// materials or details — kept apart so one selection never does both.
type Mode = 'create' | 'edit'

const MODE_ONLY: Record<Mode, string> = {
  create: 'group-data-[mode=edit]/variants:hidden',
  edit:   'group-data-[mode=create]/variants:hidden',
}

const RowCheckbox = ({ state, mode }: { state: { enabled: boolean; checked: boolean | 'indeterminate' }; mode: Mode }) => (
  <Checkbox checked={state.checked} disabled={!state.enabled} tabIndex={-1} className={cn('pointer-events-none', MODE_ONLY[mode])} />
)

const getRowId = ({ row }: any) => row.color as string

const emptyText = (mode: Mode, filtered: boolean, hasColors: boolean) => {
  if (!hasColors) return filtered ? 'Немає кольорів за фільтром' : 'Немає кольорів базової тканини'
  const scope = filtered ? ' для вибраних кольорів' : ''
  return mode === 'create' ? `Усі варіанти${scope} вже створено` : `Ще немає створених варіантів${scope}`
}


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
  const [mode, setMode] = useState<Mode>('create')

  const isLoading = loadingProducts || loadingColors

  // Clearing an already empty selection keeps the same Set, so the rows — and
  // the table — stay as they are.
  const changeMode = (next: Mode) => {
    setMode(next)
    setPending(prev => prev.size ? new Set() : prev)
    setSelectedVariants(prev => prev.size ? new Set() : prev)
  }

  const colorNames = useMemo(() => fabricColors.map(f => f.color), [fabricColors])

  // Rows hold both modes' state; the mode picks which rows show and, through
  // CSS, which state — the table re-renders on a switch only for the row list.
  const { variantSet, rows: allRows } = useMemo(() => {
    const variantSet = new Set<string>()
    const migratedSet = new Set<string>()
    for (const p of products) {
      const key = `${p.color}__${p.size}`
      variantSet.add(key)
      if (p.migrated) migratedSet.add(key)
    }

    const checkState = (total: number, active: number) =>
      total > 0 && active === total ? true : active > 0 ? 'indeterminate' : false

    const rows = fabricColors
      .filter(f => colorFilter.length === 0 || colorFilter.includes(f.color))
      .map(f => {
        const row: Record<string, any> = { color: f.color }
        let missing = 0, pendingCount = 0, existing = 0, selectedCount = 0
        for (const size of productSizes) {
          const key = `${f.color}__${size}`
          const exists = variantSet.has(key)
          row[`__status_${size}`] = exists
            ? selectedVariants.has(key) ? 'selected' : 'exists'
            : pending.has(key) ? 'pending' : 'none'
          row[`__migrated_${size}`] = migratedSet.has(key)
          if (exists) { existing++; if (selectedVariants.has(key)) selectedCount++ }
          else { missing++; if (pending.has(key)) pendingCount++ }
        }
        row.__create = { enabled: missing > 0, checked: checkState(missing, pendingCount) }
        row.__edit   = { enabled: existing > 0, checked: checkState(existing, selectedCount) }
        return row
      })

    return { variantSet, rows }
  }, [products, fabricColors, pending, selectedVariants, colorFilter])

  // Creating shows the colors with a size still missing; editing, those with one made.
  const rows = useMemo(
    () => allRows.filter(row => (mode === 'create' ? row.__create : row.__edit).enabled),
    [allRows, mode]
  )

  const selectedProductIds = useMemo(
    () => products.filter(p => selectedVariants.has(`${p.color}__${p.size}`)).map(p => p._id),
    [products, selectedVariants]
  )

  // Handlers read the latest state from refs, so the headers and the click
  // handler handed to the table are built once.
  const latest = useRef({ mode, variantSet, rows })
  latest.current = { mode, variantSet, rows }

  // Sets the keys the current mode works on: all on, or all off when they already are.
  const toggleKeys = useCallback((keys: string[], on?: boolean) => {
    const { mode, variantSet } = latest.current
    const targets = keys.filter(key => variantSet.has(key) === (mode === 'edit'))
    const setter = mode === 'edit' ? setSelectedVariants : setPending
    setter(prev => {
      const turnOn = on ?? !targets.every(key => prev.has(key))
      const next = new Set(prev)
      for (const key of targets) turnOn ? next.add(key) : next.delete(key)
      return next
    })
  }, [])

  const handleCellClick = useCallback(({ accessor, row }: CellClickProps) => {
    const color = (row as any).color
    if (accessor === 'color') {
      toggleKeys(productSizes.map(size => `${color}__${size}`))
      return
    }
    if (productSizes.includes(accessor as string)) toggleKeys([`${color}__${accessor}`])
  }, [toggleKeys])

  const openVariantDetails = useCallback((product: { _id: Id<'products'>, color: string, size: string }) => {
    openDialog({
      title: `${product.color} · ${product.size}`,
      className: 'sm:w-200 sm:max-w-200',
      content: <VariantDetailContent productId={product._id} />,
    })
  }, [openDialog])

  const handleColumnSelect = useCallback((size: string) => {
    toggleKeys(latest.current.rows.map(r => `${(r as any).color}__${size}`))
  }, [toggleKeys])

  const tableHeaders: HeaderObject[] = useMemo(() => [
    {
      accessor: 'color',
      label: '',
      width: 170,
      type: 'string',
      pinned: 'left',
      cellRenderer: ({ row }: { row: Record<string, any> }) => (
        <span className="flex items-center gap-2 w-full h-full cursor-pointer">
          <RowCheckbox state={row.__create} mode="create" />
          <RowCheckbox state={row.__edit} mode="edit" />
          <span className="truncate">{row.color}</span>
        </span>
      ),
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
        const migrated = row[`__migrated_${size}`] as boolean
        if (status === 'selected') return <SelectedCheckCell migrated={migrated} />
        if (status === 'exists') return <CheckCell migrated={migrated} />
        if (status === 'pending') return <PlusCell />
        return <EmptyCell />
      },
    })),
  ], [handleColumnSelect])

  // Same props → same element, so React skips the table when only the toolbar changes.
  const table = useMemo(() => (
    <AppTable
      rows={rows}
      defaultHeaders={tableHeaders}
      isLoading={isLoading}
      getRowId={getRowId}
      height="100%"
      onCellClick={handleCellClick}
    />
  ), [rows, tableHeaders, isLoading, handleCellClick])

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
          <Tabs value={mode} onValueChange={value => changeMode(value as Mode)}>
            <TabsList className="h-7!">
              <TabsTrigger value="create" className="text-[11px] px-2">Створення</TabsTrigger>
              <TabsTrigger value="edit" className="text-[11px] px-2">Редагування</TabsTrigger>
            </TabsList>
          </Tabs>
          <FilterMenu
            label="Колір"
            options={colorNames.map(c => ({ value: c, label: c }))}
            selected={colorFilter}
            onChange={setColorFilter}
            searchPlaceholder="Пошук кольору..."
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {selectedProductIds.length === 1 && (
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-[11px] px-2"
              onClick={() => {
                const product = products.find(p => p._id === selectedProductIds[0])
                if (product) openVariantDetails(product)
              }}
            >
              <Info size={10} className="mr-1" />
              Деталі варіанта
            </Button>
          )}
          {selectedProductIds.length > 0 && (
            <Button size="sm" variant="outline" className="h-6 text-[11px] px-2" onClick={handleEditMaterials}>
              <SquarePen size={10} className="mr-1" />
              Оновити матеріали ({selectedProductIds.length})
            </Button>
          )}
          {mode === 'create' && (
            <Button size="sm" className="h-6 text-[11px] px-2" onClick={handleCreate} disabled={pending.size <= 0 || isPending}>
              <Plus size={10} className="mr-1" />
              Створити ({pending.size})
            </Button>
          )}
        </div>
      </div>
      {/* The table's own frame would double the section's border. */}
      <div data-mode={mode} className="group/variants flex-1 min-h-0 [&_.st-wrapper]:border-0 [&_.st-wrapper]:rounded-none">
        {!isLoading && rows.length === 0
          ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              {emptyText(mode, colorFilter.length > 0, allRows.length > 0)}
            </div>
          )
          : table}
      </div>
    </div>
  )
}
