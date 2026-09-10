import { createFileRoute } from '@tanstack/react-router'
import SettingsPage from '@/route-components/settings'

export const Route = createFileRoute('/_authenticated/app/settings')({
  component: SettingsPage,
})
