import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import Header from '@/components/Header'
import { has } from 'ramda'
import { api } from 'convex/_generated/api'
import { convexQuery } from '@convex-dev/react-query'

export const Route = createFileRoute('/app')({
  beforeLoad: async ({ context: { queryClient} }) => {
    console.log('IN route')
    const auth = await queryClient.ensureQueryData(convexQuery(api.auth.authMutation))
    console.log("index ~ auth:", auth)
    if (has('code', auth)) {
      throw redirect({to:'/app/fabrics'})
    }

    throw redirect({ to: '/seamstress' })
  },
  component: RouteComponent,
})

function RouteComponent() {
  return <div>
    <Header />
    <Outlet />
  </div>
}
