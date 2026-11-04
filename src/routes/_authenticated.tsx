import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/hooks/auth-hooks';
import { createFileRoute, Outlet, useLocation, useRouter } from '@tanstack/react-router'
import { useEffect } from 'react';
import { SUPER_ADMIN } from '@/constants/roles';
import { PendingApproval } from '@/route-components/auth/pending-approval';

export const Route = createFileRoute('/_authenticated')({
  component: RouteComponent,
})

function RouteComponent() {
  const router = useRouter();
  const location = useLocation()
  const { isAuthenticated, isLoading, user } = useAuth();
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.navigate({
        to: '/login',
        search: { redirectTo: location.href },
      })
    }
  }, [isAuthenticated, isLoading])

  // Wait for the user record too, so an unapproved user never sees the app.
  if (isLoading || !isAuthenticated || user === undefined) {
    return <div className='flex justify-center gap-2 items-center w-screen h-screen'>
      <Spinner className='h-5 w-5'/>
    </div>
  }

  if (user?.isApproved === false && user.role !== SUPER_ADMIN) {
    return <PendingApproval email={user.email} />
  }

  return <Outlet/>
}
