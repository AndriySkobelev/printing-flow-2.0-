import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/_authenticated')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>
    prfile route
    <Outlet />
  </div>
}
    