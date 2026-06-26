import { createFileRoute } from '@tanstack/react-router'
import InventoryMovement from '@/route-components/incoming-materials'

export const Route = createFileRoute('/_authenticated/app/inventory-movement')({
  component: InventoryMovement,
})
