import PackingListPage from '@/route-components/packing-list'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/app/packing-list')({
  component: PackingListPage,
})
