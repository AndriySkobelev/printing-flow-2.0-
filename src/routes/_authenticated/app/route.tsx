import { useEffect } from 'react'
import { createFileRoute, Outlet, useLocation, useRouter } from '@tanstack/react-router'
import Header from '@/components/Header'
import { Spinner } from '@/components/ui/spinner'
import { useAuth } from '@/hooks/auth-hooks'
import { canAccessPage, getFirstAccessiblePage } from '@/constants/page-roles'

const RouteComponent = () => {
  const { user, isLoading } = useAuth()
  const location = useLocation()
  const router = useRouter()

  // `user` (and its role) loads slightly after `isAuthenticated`, so treat
  // "not loaded yet" as neither allowed nor denied — just wait for it.
  const roleReady = !isLoading && !!user
  const allowed = roleReady && canAccessPage(user.role, location.pathname)

  useEffect(() => {
    if (roleReady && !allowed) {
      router.navigate({ to: getFirstAccessiblePage(user.role) })
    }
  }, [roleReady, allowed, location.pathname])

  return <div>
    <Header />
    <div className='bg-primary/3 rounded-xl h-[90vh] w-[98vw] mx-auto shadow-[0px_0px_3px_#021b333d]'>
      {allowed
        ? <Outlet />
        : <div className='flex justify-center items-center h-full'>
            <Spinner className='h-5 w-5' />
          </div>}
    </div>
  </div>
}

export const Route = createFileRoute('/_authenticated/app')({
  component: RouteComponent,
})
