import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import Header from '@/components/Header'

export const Route = createFileRoute('/_authenticated/app')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>
    <Header />
    <Outlet />
  </div>
}
