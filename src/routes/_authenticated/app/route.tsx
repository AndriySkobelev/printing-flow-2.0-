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
  const allowed = roleReady && canAccessPage(user, location.pathname)

  useEffect(() => {
    if (roleReady && !allowed) {
      router.navigate({ to: getFirstAccessiblePage(user) })
    }
  }, [roleReady, allowed, location.pathname])

  return <div className='flex h-dvh flex-col'>
    <Header />
    <div className='bg-primary/3 rounded-xl flex-1 min-h-0 mb-2 overflow-auto w-[98vw] mx-auto shadow-[0px_0px_3px_#021b333d]'>
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
