import { createFileRoute } from '@tanstack/react-router'
import Seamstress from '@/route-components/seamstress'

export const Route = createFileRoute('/_authenticated/seamstress')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div><Seamstress/></div>
}
