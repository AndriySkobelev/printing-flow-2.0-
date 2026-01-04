import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/_authenticated/layout/profile')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>--- profile</div>
}
