import { useAuth } from '@/hooks/auth-hooks';
import { createFileRoute, Navigate, Outlet, useLocation, useRouter } from '@tanstack/react-router'
import { useEffect } from 'react';

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
  const router = useRouter();
  const location = useLocation()
  console.log("🚀 ~ RouteComponent ~ location:", location)
  console.log("🚀 ~ RouteComponent ~ route:", router)
  const { isAuthenticated, isLoading } = useAuth();
  console.log("🚀 ~ RouteComponent ~ isLoading:", isLoading)
  console.log("🚀 ~ RouteComponent ~ isAuthenticated:", isAuthenticated)
 
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.navigate({
        to: '/login',
        search: { redirectTo: location.href },
      })
    }
  }, [isAuthenticated, isLoading])
  if (isLoading) {
    return <div>Loading...</div>
  }
  if (!isAuthenticated) {
    return null
  }
  return <Outlet/>
}
