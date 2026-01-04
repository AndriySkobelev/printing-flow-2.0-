import { createFileRoute } from '@tanstack/react-router';
import { signIn } from '@/lib/auth/auth-server'; 

export const Route = createFileRoute('/api/sin_in')({
  server: {
    handlers: {
      POST: async ({ request }: any) => {
        const body = await request.json();
        const login: any = await signIn({ data: body })
        const { data, error } = login;

        if (login.status !== 200) {
          return new Response(data, {
            status: 200,
          });
        }
        return new Response(error, {
          status: 400,
        });
      }
    }
  }
})

