import { createFileRoute, Outlet } from '@tanstack/react-router'
import Header from '@/components/Header'
export const Route = createFileRoute('/app')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>
    <Header />
    <Outlet />
  </div>
}
