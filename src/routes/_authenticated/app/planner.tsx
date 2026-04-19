import { createFileRoute } from '@tanstack/react-router'
import Planner from '@/route-components/planer'

export const Route = createFileRoute('/_authenticated/app/planner')({
  component: RouteComponent,
})

function RouteComponent() {
  // TODO: replace with real orders from your API
  return <Planner />
}