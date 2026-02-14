import { ErrorComponent, createRouter } from '@tanstack/react-router'
import {
  MutationCache,
  QueryClient,
} from '@tanstack/react-query'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import { ConvexQueryClient } from '@convex-dev/react-query'
import { ConvexProvider } from 'convex/react'
import { toast } from 'sonner'
import '@/lib/i18n';

// Import the generated route tree
import { routeTree } from './routeTree.gen'
import { ContextDialogComponent } from './contexts/dialog'

// Create a new router instance
export const getRouter = () => {
  const CONVEX_URL = (import.meta as any).env.VITE_CONVEX_URL!
  if (!CONVEX_URL) {
    console.error('missing envar CONVEX_URL')
  }
  const convexQueryClient = new ConvexQueryClient(CONVEX_URL)

  const queryClient: QueryClient = new QueryClient({
    defaultOptions: {
      queries: {
        queryKeyHashFn: convexQueryClient.hashFn(),
        queryFn: convexQueryClient.queryFn(),
      },
    },
    mutationCache: new MutationCache({
      onError: (error) => {
        toast(error.message, { className: 'bg-red-500 text-white' })
      },
    }),
  })
  convexQueryClient.connect(queryClient)
  const router = createRouter({
    routeTree,
    defaultPreload: 'intent',
    defaultErrorComponent: ErrorComponent,
    defaultNotFoundComponent: () => <div>Not Found</div>,
    context: { queryClient },
    Wrap: ({ children }) => (
      <ConvexProvider client={convexQueryClient.convexClient}>
        <ContextDialogComponent>
          {children}
        </ContextDialogComponent>
      </ConvexProvider>
    ),
    scrollRestoration: true,
  })
  setupRouterSsrQueryIntegration({
    router,
    queryClient,
  })

  return router
}
