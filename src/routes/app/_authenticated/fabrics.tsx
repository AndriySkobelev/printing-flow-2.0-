import Fabrics from '@/route-components/fabrics'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/_authenticated/fabrics')({
  component: RouteComponent,
})

function RouteComponent() {
  return <Fabrics/>
}
