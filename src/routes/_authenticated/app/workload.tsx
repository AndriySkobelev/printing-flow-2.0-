import { createFileRoute } from '@tanstack/react-router'
import Workload from '@/route-components/workload'
export const Route = createFileRoute('/_authenticated/app/workload')({
  component: RouteComponent,
})

function RouteComponent() {
  return <Workload />
}
