import { useAuthActions } from '@convex-dev/auth/react'
import { Clock, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const PendingApproval = ({ email }: { email?: string }) => {
  const { signOut } = useAuthActions()

  return (
    <div className="flex flex-col items-center justify-center gap-4 h-screen px-4 text-center">
      <Clock size={40} strokeWidth={1.5} className="text-muted-foreground" />
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold">Очікуйте підтвердження</h1>
        <p className="text-sm text-muted-foreground max-w-sm">
          Ваш акаунт{email ? ` ${email}` : ''} створено. Доступ відкриється, щойно менеджер його підтвердить.
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={() => signOut()}>
        <LogOut size={14} /> Вийти
      </Button>
    </div>
  )
}
