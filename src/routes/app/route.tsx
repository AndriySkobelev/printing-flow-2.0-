import { createFileRoute, Outlet } from '@tanstack/react-router'
import Header from '@/components/Header'
import { api } from 'convex/_generated/api'
import { convexQuery } from '@convex-dev/react-query'

export const Route = createFileRoute('/app')({
  component: RouteComponent,
  beforeLoad: async ({ context: { queryClient} }) => {
    const some = await queryClient.ensureQueryData(convexQuery(api.auth.authMutation))
  }
})

function RouteComponent() {
  return <div>
    <Header />
    <Outlet />
  </div>
}
