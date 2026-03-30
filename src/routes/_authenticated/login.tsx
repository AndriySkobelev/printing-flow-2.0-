import { createFileRoute } from '@tanstack/react-router'
import { useAuthActions } from "@convex-dev/auth/react";
import LoginForm from '@/route-components/auth/forms/login'

export const Route = createFileRoute('/_authenticated/login')({
  component: RouteComponent,
})

function RouteComponent() {
  const { signIn,  } = useAuthActions();
  const handleSubmit = (actionName: string) => {
    console.log('here')
    const some = signIn(actionName, { redirectTo: '/app/fabrics'})
    console.log("🚀 ~ handleSubmit ~ some:", some)
  }

  return (
    <div className='flex justify-center items-center h-screen'>
      <LoginForm formId='login-form' actionSubmit={handleSubmit}/>
    </div>
  );
}
