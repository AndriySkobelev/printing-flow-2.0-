import { createFileRoute } from '@tanstack/react-router'
import OrderProcessing from '@/route-components/order-processing'

export const Route = createFileRoute('/_authenticated/app/order-processing')({
  component: OrderProcessing,
})
