import { createFileRoute } from '@tanstack/react-router'
import Planner from '@/route-components/planer'
import { MyGantt } from '@/components/my-gantt'

export const Route = createFileRoute('/_authenticated/app/planner')({
  component: RouteComponent,
})

function RouteComponent() {
  // TODO: replace with real orders from your API
  // return <Planner />
  return <div className='overflow-y-auto max-h-[80vh]'>
    <MyGantt/>
    </div>
}