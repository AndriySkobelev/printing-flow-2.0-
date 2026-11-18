import { useMutation } from '@tanstack/react-query'
import { useConvexMutation } from '@convex-dev/react-query'
import { api } from 'convex/_generated/api'
import { toast } from 'sonner'

export const useUpdateProfile = () =>
  useMutation({
    mutationFn: useConvexMutation(api.queries.users.updateCurrentUser),
    onSuccess: () => toast.success('Профіль оновлено.', { duration: 3000, position: 'top-center' }),
    onError: (e: Error) => toast.error(`Помилка: ${e.message}`, { duration: 3000, position: 'top-center' }),
  })
