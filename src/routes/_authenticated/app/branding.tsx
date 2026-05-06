import { BrandingPage } from '@/route-components/branding'
import { createFileRoute } from '@tanstack/react-router'
import { api } from 'convex/_generated/api'

export const Route = createFileRoute('/_authenticated/app/branding')({
  loader: async ({ context }) => {
    await context.convexClient.action(api.http_actions.orders.brandingOrder)
  },
  component: RouteComponent,
})

function RouteComponent() {
  return <BrandingPage/>
}
