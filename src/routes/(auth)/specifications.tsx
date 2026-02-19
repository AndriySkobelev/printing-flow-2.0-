import { createFileRoute } from '@tanstack/react-router'
import SpecificationsTable from '@/route-components/specifications'

export const Route = createFileRoute('/(auth)/specifications')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div>
      <SpecificationsTable />
    </div>
  )
}
