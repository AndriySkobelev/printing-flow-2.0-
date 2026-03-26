import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import Header from '@/components/Header'
import { api } from 'convex/_generated/api'
import { convexQuery } from '@convex-dev/react-query'

export const Route = createFileRoute('/app')({
  component: RouteComponent,
  beforeLoad: async ({ context: { queryClient} }) => {
    const auth = await queryClient.ensureQueryData(convexQuery(api.auth.authMutation))
    if (auth && 'code' in auth && auth.code === 400) {
      throw redirect({ to: '/login'})
    }
  }
})

function RouteComponent() {
  return <div>
    <Header />
    <Outlet />
  </div>
}
