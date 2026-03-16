import { createFileRoute } from '@tanstack/react-router'
import Specifications from '@/route-components/specifications'

export const Route = createFileRoute('/app/(auth)/specifications')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div>
      <Specifications />
    </div>
  )
}
