import { createFileRoute } from '@tanstack/react-router'
import OrderProcessing from '@/route-components/order-processing'

// Opened from the link in a KeyCRM order: the invoice tab for that order number.
const RouteComponent = () => {
  const { orderNumber } = Route.useParams()
  return <OrderProcessing orderNumber={orderNumber} />
}

export const Route = createFileRoute('/_authenticated/app/order-processing_/$orderNumber')({
  component: RouteComponent,
})
