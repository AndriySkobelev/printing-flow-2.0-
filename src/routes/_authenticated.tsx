import { useAuth } from '@/hooks/auth-hooks';
import { createFileRoute, Navigate, Outlet, useLocation, useRouter } from '@tanstack/react-router'

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
  const route = useRouter();
  const location = useLocation()
  console.log("🚀 ~ RouteComponent ~ location:", location)
  console.log("🚀 ~ RouteComponent ~ route:", route)
  const { isAuthenticated, isLoading } = useAuth();
  console.log("🚀 ~ RouteComponent ~ isLoading:", isLoading)
  console.log("🚀 ~ RouteComponent ~ isAuthenticated:", isAuthenticated)
  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        from={`/${location.href}` as any}/>
    )
  }
  return <Outlet/>
}
