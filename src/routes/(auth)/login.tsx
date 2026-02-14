import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
// components
import LogInForm from '../../components/auth/login-form'
// hooks
import { loginSupabaseFn } from '@/lib/auth/auth-server'
import { useMutation, useQuery, useQueryClient  } from '@tanstack/react-query'

type LoginSupabaseFnResponse = {
  error?: boolean | undefined;
  message?: string | undefined;
}
// route
export const Route = createFileRoute('/(auth)/login')({
  component: RouteComponent,
})

function RouteComponent() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { mutate: logIn } = useMutation({
    mutationFn: (data: any) =>  loginSupabaseFn({ data }),
    onSuccess: (data) => {
      console.log('HERE', data)
      queryClient.resetQueries()
      navigate({ to: "/" })
      if (data?.error) {
        toast.error(data?.message, {
          duration: 3000,
          position: 'top-center',
        })
      }
    },
  })

  return (
    <div>
      <LogInForm actionSubmit={logIn} />
    </div>
  )
}
