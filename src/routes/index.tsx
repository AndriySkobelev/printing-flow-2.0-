import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  loader: async () => {
    throw redirect({to:'/app'})
  },
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello ""!</div>
}
