import { BrandingPage } from '@/route-components/branding'
import { createFileRoute } from '@tanstack/react-router'
import { ConvexHttpClient } from 'convex/browser'
import { api } from 'convex/_generated/api'

const CONVEX_URL = (import.meta as any).env.VITE_CONVEX_URL!

export const Route = createFileRoute('/_authenticated/app/branding')({
  loader: async ({ context }) => {
    if (typeof window === 'undefined') {
      const http = new ConvexHttpClient(CONVEX_URL)
      await http.action(api.http_actions.orders.brandingOrder)
    } else {
      await context.convexClient.action(api.http_actions.orders.brandingOrder)
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  return <BrandingPage/>
}
