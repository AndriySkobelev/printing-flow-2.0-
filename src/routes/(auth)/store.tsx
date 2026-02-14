import { createFileRoute } from '@tanstack/react-router'
import Store from '@/route-components/store'
import { convexQuery } from '@convex-dev/react-query'
import { api } from 'convex/_generated/api'


export const Route = createFileRoute('/(auth)/store')({
  component: Store,
  loader: async ({ context }) => {
    return context.queryClient.ensureQueryData(convexQuery(api.materials.getMaterials, {}));
  }
})

