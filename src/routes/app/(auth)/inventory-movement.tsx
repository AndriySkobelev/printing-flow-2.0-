import { createFileRoute } from '@tanstack/react-router'
import InventoryMovement from '@/route-components/incoming-materials'

export const Route = createFileRoute('/app/(auth)/inventory-movement')({
  component: InventoryMovement,
})
