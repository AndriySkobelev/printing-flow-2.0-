import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import Header from '@/components/Header'

export const Route = createFileRoute('/_authenticated/app')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>
    <Header />
    <div className='bg-primary/3 rounded-xl h-[90vh] w-[98vw] mx-auto shadow-[0px_0px_3px_#021b333d]'>
      <Outlet />
    </div>
  </div>
}
