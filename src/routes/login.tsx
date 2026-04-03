import { createFileRoute, useRouter, useSearch } from '@tanstack/react-router'
import { useAuthActions } from "@convex-dev/auth/react";
import LoginForm from '@/route-components/auth/forms/login'

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, string>) => ({
    redirectTo: search.redirectTo as string | undefined,
  }),
  component: RouteComponent,
})

function RouteComponent() {
  const search = useSearch({ from: '/login'})
  const { signIn,  } = useAuthActions();
  const handleSubmit = (actionName: string) => {
    const some = signIn(actionName, { redirectTo: search.redirectTo ?? '/app'})
  }

  return (
    <div className='flex justify-center items-center h-screen'>
      <LoginForm formId='login-form' actionSubmit={handleSubmit}/>
    </div>
  );
}
