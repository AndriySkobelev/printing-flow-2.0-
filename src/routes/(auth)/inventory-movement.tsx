import { createFileRoute } from '@tanstack/react-router'
import InventoryMovement from '@/route-components/incoming-materials'

export const Route = createFileRoute('/(auth)/inventory-movement')({
  component: InventoryMovement,
})
