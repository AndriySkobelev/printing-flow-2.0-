import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
// components
import LogInForm from './-components/login-form'
// hooks
import { serverSinIn } from '@/lib/auth/auth-server'

// route
export const Route = createFileRoute('/(auth)/login')({
  component: RouteComponent,
})

function RouteComponent() {
  const { t } = useTranslation();

  const navigate = useNavigate();
  const actionSubmit = async (data: any) => {
    const response = await fetch('/api/sin_in', {
      method: 'POST',
      body: JSON.stringify(data)
    });

    if (response.status === 200) {
      throw navigate({ to: '/'})
    }
    console.log('HERE')
    toast.error(response.statusText, {
      duration: 3000,
      position: 'bottom-center',
    })
  }

  return (
    <div>
      <LogInForm actionSubmit={actionSubmit} />
    </div>
  )
}
