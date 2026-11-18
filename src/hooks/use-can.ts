import { useCallback } from 'react'
import { can, type PageAction } from 'convex/lib/roles'
import { useAuth } from '@/hooks/auth-hooks'

// Whether the signed-in user's role allows `action` on `page` — for hiding
// buttons; the mutations check the same on the server.
export const useCan = () => {
  const { user } = useAuth()
  return useCallback((page: string, action: PageAction) => can(user, page, action), [user])
}
