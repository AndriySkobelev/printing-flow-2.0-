import { getUser } from '@/services/server-func/auth'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_app')({
  beforeLoad: async ({ context }) => {
    const isAuth = await context.authState.isAuthenticated
    console.log('isAuth', isAuth)
    if (!isAuth) {
      throw redirect({
        to: '/login'
      })
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const getUserData = async () => {
    const response = await getUser();
    console.log('response', response)
  }
  return <div>
    app route
    <button onClick={getUserData}>click</button>
    <Outlet />
  </div>
}
