import { createFileRoute } from '@tanstack/react-router'
import ExtraWorksPage from '@/route-components/extra-works'

export const Route = createFileRoute('/_authenticated/app/extra-works')({
  component: ExtraWorksPage,
})
