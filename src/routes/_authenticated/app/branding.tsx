import { BrandingPage } from '@/route-components/branding'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/app/branding')({
  component: RouteComponent,
})

function RouteComponent() {
  return <BrandingPage/>
}
