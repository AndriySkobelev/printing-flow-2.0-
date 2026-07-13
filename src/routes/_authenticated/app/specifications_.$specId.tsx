import { createFileRoute } from '@tanstack/react-router'
import { SpecDetails } from '@/route-components/specification-details'

const RouteComponent = () => {
  const { specId } = Route.useParams()
  return (
    <div className="p-4 h-full">
      <SpecDetails specificationId={specId} />
    </div>
  )
}

export const Route = createFileRoute(
  '/_authenticated/app/specifications_/$specId',
)({
  component: RouteComponent,
})
