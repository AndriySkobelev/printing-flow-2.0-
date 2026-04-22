import { useConvexMutation } from '@convex-dev/react-query'
import { useMutation } from '@tanstack/react-query'
import { api } from 'convex/_generated/api'
import { toast } from 'sonner'

export function useAddCuttingTaskSizeLog(onSuccess?: () => void) {
  return useMutation({
    mutationFn: useConvexMutation(api.queries.cutting.addCuttingTaskSizeLog),
    onSuccess: () => {
      toast.success('Збережено', { duration: 2000, position: 'top-center' })
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(`Помилка: ${error.message}`, { duration: 3000, position: 'top-center' })
    },
  })
}
