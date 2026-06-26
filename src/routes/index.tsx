import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({ to: '/app/fabrics' })
  },
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello index file "/"!</div>
}
