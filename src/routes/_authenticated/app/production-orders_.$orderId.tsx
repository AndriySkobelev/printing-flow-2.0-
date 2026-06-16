import { OrderDetails } from '@/route-components/order-details'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/_authenticated/app/production-orders_/$orderId',
)({
  component: RouteComponent,
})

const RouteComponent = () => {
  const params = Route.useParams()
  const navigate = useNavigate()
  return (
    <OrderDetails
      productionOrderId={params.orderId}
      onBack={() => navigate({ to: '/app/production-orders' })}
    />
  )
}
