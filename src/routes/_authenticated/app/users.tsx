import { createFileRoute } from '@tanstack/react-router'
import UsersTable from '@/route-components/users'

export const Route = createFileRoute('/_authenticated/app/users')({
  component: UsersTable,
})
