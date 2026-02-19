import { createFileRoute } from '@tanstack/react-router';
import Products from '@/route-components/products';

export const Route = createFileRoute('/(auth)/products')({
  component: Products,
})

function RouteComponent() {
  return <div></div>
}
