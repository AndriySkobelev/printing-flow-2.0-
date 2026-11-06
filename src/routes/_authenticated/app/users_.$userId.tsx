import { createFileRoute } from '@tanstack/react-router'
import { type Id } from 'convex/_generated/dataModel'
import { UserDetails } from '@/route-components/users/user-details'

const RouteComponent = () => {
  const { userId } = Route.useParams()
  return <UserDetails userId={userId as Id<'users'>} />
}

export const Route = createFileRoute('/_authenticated/app/users_/$userId')({
  component: RouteComponent,
})
