import { createContext, useContext, useEffect, useMemo, useRef, useState, type SyntheticEvent } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { useQueries } from 'convex/react'
import { useDebounce } from 'use-debounce'
import { type FunctionReturnType } from 'convex/server'
import { api } from 'convex/_generated/api'
import { type HeaderObject, type OnRowGroupExpandProps } from 'simple-table-core'
import { omit } from 'ramda'
import { Search } from 'lucide-react'
import AppTable from '@/components/ui/app-table'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

type Group = FunctionReturnType<typeof api.queries.movements.getStockBalanceGroups>[number]
type Item = FunctionReturnType<typeof api.queries.movements.getStockBalanceGroupItems>[number]
type GroupRow = Group & { loadedCount: number }
type RowCallbacks = Pick<OnRowGroupExpandProps, 'setLoading' | 'setError'>

const MATERIAL_TYPE_LABELS: Record<Group['materialType'], string> = {
  fabricVariants: 'Тканина',
  materialVariants: 'Матеріал',
}

const renderHeader = ({ header }: { header: HeaderObject }) => (
  <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/50 px-2">
    {header.label}
  </span>
)

const formatQty = (value: number) => value.toLocaleString('uk-UA', { maximumFractionDigits: 2 })

const Quantity = ({ value, units, className }: { value: number; units?: string; className?: string }) => (
  <span className={cn('inline-flex items-baseline gap-1 tabular-nums', className)}>
    {formatQty(value)}
    {units && <span className="text-xs font-normal opacity-60">{units}</span>}
  </span>
)

const availableTone = (value: number) => (value < 0 ? 'negative' : value === 0 ? 'empty' : 'positive')

const GROUP_AVAILABLE = {
  positive: 'bg-green-100 text-green-800',
  negative: 'bg-red-100 text-red-700',
  empty:    'bg-muted text-muted-foreground',
} as const

const ITEM_AVAILABLE = {
  positive: 'text-green-700',
  negative: 'text-red-600',
  empty:    'text-muted-foreground',
} as const

const formatDate = ({ value }: { value: unknown }) =>
  value
    ? new Date(value as number).toLocaleDateString('uk-UA', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—'

const textCell = (className: string) => ({ row, accessor }: any) => (
  <span className={className}>{row[accessor] || '—'}</span>
)

type GroupSearch = {
  filters: Record<string, string>
  expanded: Set<string>
  setFilter: (groupId: string, value: string) => void
}

// Context rather than row data, so typing doesn't rebuild the table headers.
const GroupSearchContext = createContext<GroupSearch>({ filters: {}, expanded: new Set(), setFilter: () => {} })

const stopPropagation = (e: SyntheticEvent) => e.stopPropagation()

const GroupSearchCell = ({ row }: { row: GroupRow }) => {
  const { filters, expanded, setFilter } = useContext(GroupSearchContext)
  if (!expanded.has(row._id) || row.loadedCount === 0) return null
  const value = filters[row._id] ?? ''
  return (
    <div className="flex w-full items-center gap-2" onClick={stopPropagation} onMouseDown={stopPropagation} onKeyDown={stopPropagation}>
      <div className="relative min-w-0 flex-1">
        <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          value={value}
          onChange={e => setFilter(row._id, e.target.value)}
          placeholder="Пошук у цьому матеріалі"
          className="h-7 pl-7 text-xs"
        />
      </div>
      {value.trim() && (
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{row.data.length} / {row.loadedCount}</span>
      )}
    </div>
  )
}

const filterItems = (items: Item[], filter = '') => {
  const tokens = filter.toLowerCase().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return items
  return items.filter(item => {
    const text = [item.color, item.size, item.sku].filter(Boolean).join(' ').toLowerCase()
    return tokens.every(token => text.includes(token))
  })
}

const quantityHeaders = (
  renderStock: (row: any) => React.ReactNode,
  renderReserved: (row: any) => React.ReactNode,
  renderAvailable: (row: any) => React.ReactNode,
): HeaderObject[] => [
  {
    accessor: 'inStock',
    label: 'В наявності',
    width: 130,
    align: 'right',
    isSortable: true,
    type: 'number',
    headerRenderer: renderHeader,
    cellRenderer: ({ row }: any) => renderStock(row),
  },
  {
    accessor: 'reserved',
    label: 'Заброньовано',
    width: 130,
    align: 'right',
    isSortable: true,
    type: 'number',
    headerRenderer: renderHeader,
    cellRenderer: ({ row }: any) => renderReserved(row),
  },
  {
    accessor: 'available',
    label: 'Доступно',
    width: 130,
    align: 'right',
    isSortable: true,
    type: 'number',
    headerRenderer: renderHeader,
    cellRenderer: ({ row }: any) => renderAvailable(row),
  },
  {
    accessor: 'updateAt',
    label: 'Оновлено',
    width: 140,
    isSortable: true,
    type: 'date',
    headerRenderer: renderHeader,
    valueFormatter: formatDate,
  },
]

const groupQuantityHeaders = quantityHeaders(
  row => <Quantity value={row.inStock} units={row.units} className="text-sm font-semibold" />,
  row => <Quantity value={row.reserved} units={row.units} className="text-sm font-semibold" />,
  row => (
    <Quantity
      value={row.available}
      units={row.units}
      className={cn('rounded-md px-2 py-1 text-sm font-semibold', GROUP_AVAILABLE[availableTone(row.available)])}
    />
  ),
)

const itemQuantityHeaders = quantityHeaders(
  row => <Quantity value={row.inStock} units={row.units} className="text-sm" />,
  row => <Quantity value={row.reserved} units={row.units} className={cn('text-sm', row.reserved === 0 && 'text-muted-foreground')} />,
  row => <Quantity value={row.available} units={row.units} className={cn('text-sm font-medium', ITEM_AVAILABLE[availableTone(row.available)])} />,
)

const itemHeaders: HeaderObject[] = [
  { accessor: 'color', label: 'Колір', width: 180, isSortable: true, type: 'string', headerRenderer: renderHeader, cellRenderer: textCell('text-sm') },
  { accessor: 'size',  label: 'Розмір', width: 100, isSortable: true, type: 'string', headerRenderer: renderHeader, cellRenderer: textCell('text-sm') },
  { accessor: 'sku',   label: 'SKU', width: 140, isSortable: true, type: 'string', headerRenderer: renderHeader, cellRenderer: textCell('text-xs text-[#868686]') },
  ...itemQuantityHeaders,
]

const groupHeaders: HeaderObject[] = [
  {
    accessor: 'name',
    label: 'Матеріал',
    width: 280,
    isSortable: true,
    expandable: true,
    type: 'string',
    headerRenderer: renderHeader,
    nestedTable: {
      defaultHeaders: itemHeaders,
      hideFooter: true,
      getRowId: ({ row }) => (row as Item)._id,
    },
    cellRenderer: ({ row }: any) => (
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm truncate">{row.name}</span>
        <span className="shrink-0 rounded-full border px-2 py-0.5 text-xs text-muted-foreground">{row.variantsCount}</span>
      </div>
    ),
  },
  {
    accessor: 'materialType',
    label: 'Тип',
    width: 120,
    isSortable: true,
    type: 'string',
    headerRenderer: renderHeader,
    cellRenderer: ({ row }: any) => <span className="text-sm">{MATERIAL_TYPE_LABELS[row.materialType as Group['materialType']]}</span>,
  },
  {
    accessor: 'supplierName',
    label: 'Постачальник',
    width: 180,
    isSortable: true,
    type: 'string',
    headerRenderer: renderHeader,
    cellRenderer: textCell('text-sm truncate'),
  },
  ...groupQuantityHeaders,
  {
    accessor: 'itemSearch',
    label: '',
    width: 260,
    type: 'other',
    cellRenderer: ({ row }: any) => <GroupSearchCell row={row} />,
  },
]

const StockBalance = () => {
  const [input, setInput] = useState('')
  const [search] = useDebounce(input.trim(), 300)
  const [openGroups, setOpenGroups] = useState<Record<string, Pick<Group, 'materialType' | 'parentId'>>>({})
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [itemFilters, setItemFilters] = useState<Record<string, string>>({})
  const pendingRows = useRef(new Map<string, RowCallbacks>())
  const isSearching = !!search

  const { data: groups, isLoading } = useQuery({
    ...convexQuery(api.queries.movements.getStockBalanceGroups, { search: search || undefined }),
    placeholderData: keepPreviousData,
  })

  const itemQueries = useMemo(
    () => Object.fromEntries(Object.entries(openGroups).map(([id, args]) => [
      id,
      { query: api.queries.movements.getStockBalanceGroupItems, args },
    ])),
    [openGroups],
  )
  const loadedItems = useQueries(itemQueries) as Record<string, Item[] | Error | undefined>

  useEffect(() => {
    pendingRows.current.forEach(({ setLoading, setError }, id) => {
      const result = loadedItems[id]
      if (result === undefined) return
      if (result instanceof Error) setError(result.message)
      else setLoading(false)
      pendingRows.current.delete(id)
    })
  }, [loadedItems])

  useEffect(() => {
    setExpanded(new Set())
    setItemFilters({})
  }, [isSearching])

  const rows: GroupRow[] = useMemo(() => (groups ?? []).map(group => {
    const loaded = loadedItems[group._id]
    const items = group.data.length > 0 || !Array.isArray(loaded) ? group.data : loaded
    return { ...group, data: filterItems(items, itemFilters[group._id]), loadedCount: items.length }
  }), [groups, loadedItems, itemFilters])

  const groupSearch = useMemo<GroupSearch>(() => ({
    filters: itemFilters,
    expanded,
    setFilter: (groupId, value) => setItemFilters(prev => ({ ...prev, [groupId]: value })),
  }), [itemFilters, expanded])

  const handleExpand = ({ row, isExpanded, setLoading, setError }: OnRowGroupExpandProps) => {
    const group = row as unknown as Group
    setExpanded(prev => {
      const next = new Set(prev)
      if (isExpanded) next.add(group._id)
      else next.delete(group._id)
      return next
    })
    if (!isExpanded) {
      setItemFilters(prev => omit([group._id], prev))
      return
    }
    if (group.data.length > 0 || openGroups[group._id]) return
    pendingRows.current.set(group._id, { setLoading, setError })
    setLoading(true)
    setOpenGroups(prev => ({ ...prev, [group._id]: { materialType: group.materialType, parentId: group.parentId } }))
  }

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="relative w-72 shrink-0">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Пошук: матеріал, колір, розмір, SKU, постачальник"
          className="h-9 pl-8 text-sm"
        />
      </div>
      <GroupSearchContext.Provider value={groupSearch}>
      <div className="min-h-0 flex-1">
        <AppTable
          key={isSearching ? 'search' : 'browse'}
          height="100%"
          rows={rows}
          isLoading={isLoading}
          rowGrouping={['data']}
          expandAll={false}
          defaultHeaders={groupHeaders}
          getRowId={({ row }: any) => row._id as string}
          onRowGroupExpand={handleExpand}
          loadingStateRenderer={<div className="flex w-full justify-center py-3"><Spinner className="h-4 w-4" /></div>}
          errorStateRenderer={<div className="w-full py-3 text-center text-sm text-red-600">Не вдалося завантажити кольори</div>}
          tableEmptyStateRenderer={<div className="py-8 text-center text-sm text-muted-foreground">Нічого не знайдено</div>}
        />
      </div>
      </GroupSearchContext.Provider>
    </div>
  )
}

export default StockBalance
