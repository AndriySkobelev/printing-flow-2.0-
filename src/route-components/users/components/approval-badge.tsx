import { Check } from 'lucide-react'
import { type Id } from 'convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { useApproveUser } from '../actions'

type Props = {
  user: { _id: Id<'users'>; isApproved?: boolean }
  canApprove: boolean
}

// Accounts signed up via Google wait here until a super_admin approves them.
export const ApprovalBadge = ({ user, canApprove }: Props) => {
  const { mutate: approveUser, isPending } = useApproveUser()
  if (user.isApproved !== false) return <span className="text-xs text-green-700">Підтверджено</span>
  if (!canApprove) return <span className="text-xs text-amber-700">Очікує підтвердження</span>
  return (
    <Button size="sm" className="h-7 text-xs" disabled={isPending} onClick={() => approveUser({ id: user._id })}>
      <Check size={12} /> Підтвердити
    </Button>
  )
}
