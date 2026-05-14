import { MyGantt } from '@/components/my-gantt'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/app/production-calendar')(
  {
    component: RouteComponent,
  },
)

function RouteComponent() {
  return <div><MyGantt/></div>
}
