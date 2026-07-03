import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from 'convex/_generated/api'
import { type FunctionReturnType } from 'convex/server'
import { OrdersList } from './components/orders-list'
import { OrderDetail } from './components/order-detail'

export type BrandingTask = NonNullable<FunctionReturnType<typeof api.queries.branding.getAllBrandingTasks>>[number]

export const BrandingPage = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { data: tasks = [] } = useQuery(convexQuery(api.queries.branding.getAllBrandingTasks, {}))

  const selectedTask = tasks.find(t => t._id === selectedId) ?? null

  return (
    <div className="relative h-full overflow-hidden md:overflow-visible md:flex md:gap-2 md:p-2">
      <div
        style={{ transform: selectedId ? 'translateX(-50%)' : 'translateX(0)' }}
        className="flex h-full w-[200%] transition-transform duration-300 ease-in-out md:contents"
      >
        <div className="w-1/2 h-full p-2 md:p-0 md:w-[30%] md:shrink-0">
          <OrdersList tasks={tasks} selectedId={selectedId} onSelect={setSelectedId} />
        </div>

        <div className="w-1/2 h-full p-1 md:p-0 md:flex-1">
          <OrderDetail task={selectedTask} onBack={() => setSelectedId(null)} />
        </div>
      </div>
    </div>
  )
}
