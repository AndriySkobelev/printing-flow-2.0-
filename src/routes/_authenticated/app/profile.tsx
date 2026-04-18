import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/app/profile')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_authenticated/app/profile"!</div>
}
