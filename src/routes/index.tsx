import { convexQuery } from '@convex-dev/react-query'
import { has } from 'ramda';
import { createFileRoute, redirect } from '@tanstack/react-router'
import { api } from 'convex/_generated/api'

export const Route = createFileRoute('/')({
  loader: async ({ context: { queryClient } }) => {
    console.log('IN index')
    const auth = await queryClient.ensureQueryData(convexQuery(api.auth.authMutation))
    console.log("index ~ auth:", auth)
    if (has('code', auth)) {
      throw redirect({to:'/login'})
    }

    throw redirect({ to: '/seamstress' })
  },
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello ""!</div>
}
