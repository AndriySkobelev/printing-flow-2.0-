import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/(auth)/materials')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/(auth)/materials"!</div>
}
