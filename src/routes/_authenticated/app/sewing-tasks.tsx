import SewingTasksPage from '@/route-components/sewing-tasks'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/app/sewing-tasks')({
  component: SewingTasksPage,
})
