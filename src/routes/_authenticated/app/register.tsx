import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import RegisterForm from '../../../components/auth/register-form'
import type { FormSchemaType } from '../../../components/auth/register-form'
import { signupSupabaseFn } from '@/lib/auth/auth-server'
// import { registerUser } from '@/lib/auth/auth-server'

export const Route = createFileRoute('/_authenticated/app/register')({
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate();
  const { t } = useTranslation();
 
  return <div>
    {/* <RegisterForm actionSubmit={actionSubmit} /> */}
  </div>
}
