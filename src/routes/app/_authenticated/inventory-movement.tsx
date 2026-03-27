import { createFileRoute } from '@tanstack/react-router'
import InventoryMovement from '@/route-components/incoming-materials'

export const Route = createFileRoute('/app/_authenticated/inventory-movement')({
  component: InventoryMovement,
})
