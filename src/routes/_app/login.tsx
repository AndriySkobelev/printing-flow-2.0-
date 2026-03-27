import { createFileRoute } from '@tanstack/react-router'
import { useAuthActions } from "@convex-dev/auth/react";
import LoginForm from '@/route-components/auth/forms/login'
import { convexQuery } from '@convex-dev/react-query';
import { api } from 'convex/_generated/api';

export const Route = createFileRoute('/_app/login')({
  component: RouteComponent,
})

function RouteComponent() {
  const { signIn,  } = useAuthActions();
  const handleSubmit = (actionName: string) => {
    console.log('here')
    const some = signIn(actionName)
    console.log("🚀 ~ handleSubmit ~ some:", some)
  }

  return (
    <div className='flex justify-center items-center h-screen'>
      <LoginForm formId='login-form' actionSubmit={handleSubmit}/>
    </div>
  );
}
