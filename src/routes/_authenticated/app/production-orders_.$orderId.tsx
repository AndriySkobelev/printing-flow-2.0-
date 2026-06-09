import { OrderDetails } from '@/route-components/order-details'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/_authenticated/app/production-orders_/$orderId',
)({
  component: RouteComponent,
})

function RouteComponent() {
  const params = Route.useParams();
  return <OrderDetails productionOrderId={params.orderId} />
}
