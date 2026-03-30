import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
  redirect,
  useRouter
} from '@tanstack/react-router'
import { useEffect } from 'react'
import { has } from 'ramda';
import { TanStackDevtools } from '@tanstack/react-devtools'
import { useTranslation } from 'react-i18next'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'
import StoreDevtools from '../lib/demo-store-devtools'
import appCss from '../styles.css?url'
import type { QueryClient } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/sonner'
import { setSSRLanguage } from '@/lib/i18n'
import { api } from 'convex/_generated/api'
import { AuthPropsType } from '@/contexts/auth';
import { convexQuery } from '@convex-dev/react-query';
import {   } from '@convex-dev/auth/react'

interface MyRouterContext {
  auth: AuthPropsType | null
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  beforeLoad: async ({ context: { queryClient } }) => {
    // const auth = await queryClient.ensureQueryData(convexQuery(api.auth.authQuery));
    const auth = await queryClient.fetchQuery(convexQuery(api.auth.authQuery));
    await setSSRLanguage();
    return {
      auth: {
        user: auth,
        isAuthenticated: !!auth
      }
    }
  },
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'TanStack Start Starter',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation()
  const router = useRouter();

  useEffect(() => {
    const handler = () => {
      router.invalidate()
    }
    i18n.on("languageChanged", handler)
    return () => {
      i18n.off("languageChanged", handler)
    }
  }, [router])
  return (
    <html lang={i18n.language} suppressHydrationWarning>
      <head>
        <HeadContent />
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com"/>
        <link href="https://fonts.googleapis.com/css2?family=Google+Sans:ital,opsz,wght@0,17..18,400..700;1,17..18,400..700&display=swap" rel="stylesheet"/>
      </head>
      <body>
        <Toaster />
        {children}
        {/* <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
            TanStackQueryDevtools,
            StoreDevtools,
          ]}
        /> */}
        <Scripts />
      </body>
    </html>
  )
}
