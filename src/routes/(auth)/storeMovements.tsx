import { createFileRoute } from '@tanstack/react-router'
import StoreMovements from '@/route-components/incoming-materials'

export const Route = createFileRoute('/(auth)/storeMovements')({
  component: StoreMovements,
})
