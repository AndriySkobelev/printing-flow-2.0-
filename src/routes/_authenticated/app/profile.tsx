import { createFileRoute } from '@tanstack/react-router'
import ProfileCard from '@/route-components/profile'

export const Route = createFileRoute('/_authenticated/app/profile')({
  component: ProfileCard,
})
