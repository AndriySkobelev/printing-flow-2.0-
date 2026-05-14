import { createFileRoute } from '@tanstack/react-router'
// import Workload from '@/route-components/workload'
import { MyGantt } from '@/components/my-gantt'

export const Route = createFileRoute('/_authenticated/app/workload')({
  component: RouteComponent,
})

function RouteComponent() {
  return <MyGantt />
}
