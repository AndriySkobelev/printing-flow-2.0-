import { useConvexMutation } from "@convex-dev/react-query"
import { useMutation } from "@tanstack/react-query"
import { api } from "convex/_generated/api"
import { toast } from "sonner"

export const useUpdateSystemSettings = () =>
  useMutation({
    mutationFn: useConvexMutation(api.queries.settings.updateSystemSettings),
    onSuccess: () => toast.success('Налаштування збережено'),
    onError: (e: Error) => toast.error(e.message),
  })
