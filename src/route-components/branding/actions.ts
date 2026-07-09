import { useMutation } from '@tanstack/react-query'
import { useConvexMutation } from '@convex-dev/react-query'
import { api } from 'convex/_generated/api'
import { toast } from 'sonner'

export const useCreateBrandingLog = (onSuccess?: () => void) =>
  useMutation({
    mutationFn: useConvexMutation(api.queries.branding.createBrandingLog),
    onSuccess: () => {
      toast.success('Збережено')
      onSuccess?.()
    },
    onError: (e: Error) => toast.error(e.message),
  })
