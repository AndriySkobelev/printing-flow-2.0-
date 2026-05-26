import { createFileRoute } from '@tanstack/react-router'
import ProductionOrdersPage from '@/route-components/production-orders'

export const Route = createFileRoute('/_authenticated/app/production-orders')({
  component: ProductionOrdersPage,
})
