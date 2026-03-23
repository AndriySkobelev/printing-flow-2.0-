import Fabrics from '@/route-components/fabrics'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/(auth)/fabrics')({
  component: RouteComponent,
})

function RouteComponent() {
  return <Fabrics/>
}
