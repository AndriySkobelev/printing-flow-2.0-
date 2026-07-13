import { createFileRoute } from '@tanstack/react-router'
import StockBalance from '@/route-components/stock-balance'

export const Route = createFileRoute('/_authenticated/app/stock-balance')({
  component: StockBalance,
})
