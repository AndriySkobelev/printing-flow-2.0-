import { createFileRoute } from '@tanstack/react-router'
import Suppliers from '@/route-components/suppliers'

export const Route = createFileRoute('/_authenticated/app/suppliers')({
  component: Suppliers,
})
