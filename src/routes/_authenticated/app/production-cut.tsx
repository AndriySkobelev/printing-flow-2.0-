import { createFileRoute } from '@tanstack/react-router'
import ProductionCut from '@/route-components/production-cut'

export const Route = createFileRoute('/_authenticated/app/production-cut')({
  component: ProductionCut,
})
