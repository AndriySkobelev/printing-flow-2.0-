import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import Header from '@/components/Header'
import { has } from 'ramda'
import { api } from 'convex/_generated/api'
import { convexQuery } from '@convex-dev/react-query'

export const Route = createFileRoute('/app')({
  component: RouteComponent,
  beforeLoad: async ({ context: { queryClient} }) => {
    // console.log('IN route')
    // const identity = await ctx.auth.getUserIdentity();
    // const auth = await queryClient.ensureQueryData(convexQuery(api.auth.authMutation))
    // console.log("index ~ auth:", auth)
    // if (has('code', auth)) {
    //   throw redirect({to:'/app/fabrics'})
    // }

    // throw redirect({ to: '/seamstress' })
  }
})

function RouteComponent() {
  return <div>
    <Header />
    <Outlet />
  </div>
}
