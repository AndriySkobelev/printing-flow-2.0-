import { createFileRoute } from '@tanstack/react-router'
import Materials from '@/route-components/materials'
export const Route = createFileRoute('/_authenticated/app/materials')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div><Materials/></div>
}
