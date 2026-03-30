import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/app/materials')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/(auth)/materials"!</div>
}
