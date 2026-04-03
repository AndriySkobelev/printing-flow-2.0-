import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/hooks/auth-hooks';
import { createFileRoute, Outlet, useLocation, useRouter } from '@tanstack/react-router'
import { useEffect } from 'react';

export const Route = createFileRoute('/_authenticated')({
  component: RouteComponent,
})

function RouteComponent() {
  const router = useRouter();
  const location = useLocation()
  const { isAuthenticated, isLoading } = useAuth();
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.navigate({
        to: '/login',
        search: { redirectTo: location.href },
      })
    }
  }, [isAuthenticated, isLoading])

  if (isLoading || !isAuthenticated) {
    return <div className='flex justify-center gap-2 items-center w-screen h-screen'>
      <Spinner className='h-5 w-5'/>
    </div>
  }

  return <Outlet/>
}
