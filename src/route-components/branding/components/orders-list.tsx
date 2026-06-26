import { useState } from 'react'
import { Search, LayoutList, LayoutGrid } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { OrderCard } from './order-card'
import type { BrandingTask } from '../index'
import Divider from '@/components/ui/divider'

type View = 'list' | 'grid'

type ToolbarProps = {
  search: string
  view: View
  onSearch: (v: string) => void
  onViewChange: (v: View) => void
}

const Toolbar = ({ search, view, onSearch, onViewChange }: ToolbarProps) => (
  <div className="flex items-center gap-1.5 p-2 border-b">
    <div className="relative flex-1">
      <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
      <Input
        value={search}
        onChange={e => onSearch(e.target.value)}
        placeholder="Пошук..."
        className="pl-7 h-8 text-xs"
      />
    </div>
    <Button
      size="icon"
      variant={view === 'list' ? 'secondary' : 'ghost'}
      className="size-7 shrink-0"
      onClick={() => onViewChange('list')}
      title="Один стовпець"
    >
      <LayoutList className="size-3.5" />
    </Button>
    <Button
      size="icon"
      variant={view === 'grid' ? 'secondary' : 'ghost'}
      className="size-7 shrink-0"
      onClick={() => onViewChange('grid')}
      title="Два стовпці"
    >
      <LayoutGrid className="size-3.5" />
    </Button>
  </div>
)

type Props = {
  tasks: BrandingTask[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export const OrdersList = ({ tasks, selectedId, onSelect }: Props) => {
  const [search, setSearch] = useState('')
  const [view, setView] = useState<View>('list')

  const filtered = tasks.filter(t => {
    const q = search.toLowerCase()
    return (
      !q ||
      t.keycrmOrderId.toLowerCase().includes(q) ||
      (t.identifierName ?? '').toLowerCase().includes(q) ||
      (t.keycrmManager ?? '').toLowerCase().includes(q)
    )
  })

  return (
    <div className="h-full shadow-[0px_0px_3px_#021b333d] rounded-lg bg-background flex flex-col overflow-hidden">
      <Toolbar search={search} view={view} onSearch={setSearch} onViewChange={setView} />

      <div className="flex-1 overflow-y-auto p-2">
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">
            {search ? 'Нічого не знайдено' : 'Немає задач'}
          </p>
        )}

        <div className={view === 'grid' ? 'grid grid-cols-2 gap-2' : 'flex flex-col gap-2'}>
          {filtered.map(task => (
            <OrderCard
              key={task._id}
              task={task}
              isSelected={selectedId === task._id}
              compact={view === 'grid'}
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
