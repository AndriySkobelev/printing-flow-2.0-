import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
  redirect,
  useRouter
} from '@tanstack/react-router'
import { useEffect } from 'react'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { useTranslation } from 'react-i18next'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'

import Header from '../components/Header'
import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'
import StoreDevtools from '../lib/demo-store-devtools'

import appCss from '../styles.css?url'
import type { QueryClient } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/sonner'

import { setSSRLanguage } from '@/lib/i18n'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  beforeLoad: async () => {
    await setSSRLanguage()
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
      </head>
      <body>
        <Header />
        <Toaster />
        {children}
        <TanStackDevtools
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
        />
        <Scripts />
      </body>
    </html>
  )
}
