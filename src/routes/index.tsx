import { convexQuery } from '@convex-dev/react-query'
import { has } from 'ramda';
import { createFileRoute, redirect } from '@tanstack/react-router'
import { api } from 'convex/_generated/api'

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({ to: '/app/fabrics' })
  },
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello index file "/"!</div>
}
