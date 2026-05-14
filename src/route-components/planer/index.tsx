import { useState } from 'react'
import ProductionPlanner from './components/ProductionPlanner'
import { OrdersList } from './components/orders-list'

const Planner = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  return (
    <div className="flex h-full border rounded-lg bg-background">
      <div className="w-92 shrink-0 border-r">
        <OrdersList selectedId={selectedId} onSelect={setSelectedId} />
      </div>
      <div className="flex-1 min-w-0 overflow-hidden">
        <ProductionPlanner />
      </div>
    </div>
  )
}

export default Planner
