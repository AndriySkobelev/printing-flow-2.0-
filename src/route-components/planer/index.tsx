import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { SewingKanban } from './components/sewing-kanban'
import { OrdersList } from './components/orders-list'

const Planner = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isListOpen, setIsListOpen] = useState(true)

  return (
    <div className="flex h-full border rounded-lg bg-background">
      <div className={cn('w-83 shrink-0 border-r', !isListOpen && 'hidden lg:block')}>
        <OrdersList selectedId={selectedId} onSelect={setSelectedId} />
      </div>
      <Button
        type="button"
        variant="ghost"
        title={isListOpen ? 'Сховати список' : 'Показати список'}
        className="h-full w-7 shrink-0 rounded-none border-r p-0 lg:hidden"
        onClick={() => setIsListOpen(open => !open)}
      >
        {isListOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </Button>
      <div className="flex-1 min-w-0 overflow-hidden">
        <SewingKanban />
      </div>
    </div>
  )
}

export default Planner
