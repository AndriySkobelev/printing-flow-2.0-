import { useAuth } from '@/hooks/auth-hooks';
import { createFileRoute, Navigate, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated')({
  // beforeLoad: ({context}) => {
  //   const { auth } = context;
  //   console.log("🚀 ~ auth:", auth)
  //   if (!auth.isAuthenticated) {
  //     throw redirect({ to: '/login' })
  //   }
  // },
  component: RouteComponent,
})

function RouteComponent() {
  const { isAuthenticated, isLoading } = useAuth();
  console.log("🚀 ~ RouteComponent ~ isLoading:", isLoading)
  console.log("🚀 ~ RouteComponent ~ isAuthenticated:", isAuthenticated)
  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />
  }
  return <Outlet/>
}
