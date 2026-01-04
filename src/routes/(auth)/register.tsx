import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import RegisterForm from '../../components/auth/register-form'
import type { FormSchemaType } from '../../components/auth/register-form'
import { signupSupabaseFn } from '@/lib/auth/auth-server'
// import { registerUser } from '@/lib/auth/auth-server'

export const Route = createFileRoute('/(auth)/register')({
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const actionSubmit = async (data: FormSchemaType) => {

    // console.log("🚀 ~ actionSubmit ~ data:", data)
    const response: any = await signupSupabaseFn({ data } as any);
    console.log("🚀 ~ response:", response)
    if (response?.error) {
    return toast.error(response.message, {
        duration: 3000,
        position: 'top-center',
      })
    }
    navigate({ to: '/login' })
  }
  return <div>
    <RegisterForm actionSubmit={actionSubmit} />
  </div>
}
