import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/app/_authenticated')({
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
  return <div><Outlet/></div>
}
