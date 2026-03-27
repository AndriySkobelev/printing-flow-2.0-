import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import Header from '@/components/Header'

export const Route = createFileRoute('/app')({
  beforeLoad: ({context}) => {
    const { auth } = context;
    console.log("🚀 ~ auth:", auth)
    if (!auth.isAuthenticated) {
      throw redirect({ to: '/login' })
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  return <div>
    <Header />
    <Outlet />
  </div>
}
