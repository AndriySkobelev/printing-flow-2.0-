import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import Header from '@/components/Header'
import { has } from 'ramda'
import { api } from 'convex/_generated/api'
import { convexQuery } from '@convex-dev/react-query'

export const Route = createFileRoute('/app')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>
    <Header />
    <Outlet />
  </div>
}
