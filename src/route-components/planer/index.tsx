import { useState } from 'react'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { SewingKanban } from './components/sewing-kanban'
import { OrdersList } from './components/orders-list'

const Planner = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isListOpen, setIsListOpen] = useState(true)

  return (
    <div className="flex h-full border rounded-lg bg-background">
      <div className={cn('w-83 shrink-0 border-r', !isListOpen && 'max-lg:hidden pointer-coarse:hidden')}>
        <OrdersList selectedId={selectedId} onSelect={setSelectedId} />
      </div>
      <div className="flex-1 min-w-0 overflow-hidden">
        <SewingKanban
          toolbarStart={
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              title={isListOpen ? 'Сховати список' : 'Показати список'}
              className="hidden shrink-0 max-lg:inline-flex pointer-coarse:inline-flex"
              onClick={() => setIsListOpen(open => !open)}
            >
              {isListOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
            </Button>
          }
        />
      </div>
    </div>
  )
}

export default Planner
