import { createFileRoute } from '@tanstack/react-router'
import { authServeMiddleware } from '@/lib/auth/auth-middleware'


export const Route = createFileRoute('/')({
  // server: {
  //   middleware: [authServeMiddleware as any]
  // },
  beforeLoad: ({ context }) => {
    console.log('beforeLoad ------- context', context)
  },
  component: App,
});

function App() {
  const data = Route.useRouteContext();
  console.log("🚀 ~ data:", data)
  return (
    <div className="min-h-screen">
        ісфісф
    </div>
  )
}
