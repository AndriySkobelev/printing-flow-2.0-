import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/app/production-calendar')(
  {
    component: RouteComponent,
  },
)

function RouteComponent() {
  return <div>Hello "/_authenticated/app/production-calendar"!</div>
}
