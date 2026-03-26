import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  loader: async () => {
    throw redirect({to:'/login'})
  },
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello ""!</div>
}
