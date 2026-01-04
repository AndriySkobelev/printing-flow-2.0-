import { createFileRoute } from '@tanstack/react-router';
import { parseCookies, redirectTo } from '@/lib/utils';
import { refreshAccessToken } from '@/lib/auth/auth-middleware';

export const Route = createFileRoute('/(auth)/refresh')({
  server: {
    handlers: {
      POST: async ({ request, context, pathname, next }: any) => {
        console.log("🚀 ~ pathname:", pathname)
        const getCookie = request.headers.get('cookie') as string;
        console.log("🚀 ~ getCookie:", getCookie)
        const cookie = parseCookies(getCookie);
        const refreshToken = cookie['refresh_token'];
        console.log("🚀 ~ refreshToken:", refreshToken)
        console.log('IN REFRESH')
        const refresh = await refreshAccessToken(refreshToken)
        console.log("🚀 ~ refresh:", refresh)
        return { response: new Response(null, {
          status: 200,
          headers: {
            Location: '/',
          },
        }) } as any
      }
    }
  }
})

