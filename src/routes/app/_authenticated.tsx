import { useAuth } from '@/hooks/auth-hooks';
import { createFileRoute, Navigate, Outlet, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/app/_authenticated')({
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
  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />
  }
  return <Outlet/>
}
