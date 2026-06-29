import { useMemo, useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from 'convex/_generated/api'
import { type Id } from 'convex/_generated/dataModel'
import { type HeaderObject, type CellClickProps, type RowSelectionChangeProps } from 'simple-table-core'
import { Check, Plus } from 'lucide-react'
import AppTable from '@/components/ui/app-table'
import { Button } from '@/components/ui/button'
import { productSizes } from '@/constants'
import { useCreateSpecVariants } from '../actions'

type Props = {
  specificationId: string
}

const CheckCell = () => (
  <span className="flex items-center justify-center"><Check size={14} className="text-green-500" /></span>
)

const PlusCell = () => (
  <span className="flex items-center justify-center"><Plus size={14} className="text-blue-500" /></span>
)

const EmptyCell = () => (
  <span className="flex items-center justify-center opacity-15 hover:opacity-50 transition-opacity cursor-pointer">
    <Plus size={14} />
  </span>
)

const tableHeaders: HeaderObject[] = [
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
    cellRenderer: ({ row }: { row: Record<string, any> }) => {
      const status = row[`__status_${size}`]
      if (status === 'exists') return <CheckCell />
      if (status === 'pending') return <PlusCell />
      return <EmptyCell />
    },
  })),
]

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

  const [pending, setPending] = useState<Set<string>>(new Set())

  const isLoading = loadingProducts || loadingColors

  const { variantSet, rows } = useMemo(() => {
    const variantSet = new Set<string>()
    for (const p of products) variantSet.add(`${p.color}__${p.size}`)

    const rows = fabricColors
      .map(f => {
        const row: Record<string, any> = { color: f.color }
        for (const size of productSizes) {
          const key = `${f.color}__${size}`
          row[`__status_${size}`] = variantSet.has(key) ? 'exists' : pending.has(key) ? 'pending' : 'none'
        }
        return row
      })
      .sort((a, b) => a.color.localeCompare(b.color))

    return { variantSet, rows }
  }, [products, fabricColors, pending])

  const handleCellClick = useCallback(({ accessor, row }: CellClickProps) => {
    if (!productSizes.includes(accessor as string)) return
    const key = `${(row as any).color}__${accessor}`
    if (variantSet.has(key)) return
    setPending(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }, [variantSet])

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
  }, [variantSet])

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
        },
      }
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2.5 border-b shrink-0 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Варіанти ({products.length})
        </p>
        <Button size="sm" className="h-6 text-[11px] px-2" onClick={handleCreate} disabled={pending.size <= 0 || isPending}>
          <Plus size={10} className="mr-1" />
          Створити ({pending.size})
        </Button>
      </div>
      <AppTable
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
