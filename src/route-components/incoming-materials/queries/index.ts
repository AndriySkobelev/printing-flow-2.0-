import { useConvexMutation } from "@convex-dev/react-query"
import { useMutation } from "@tanstack/react-query";
import { api } from "convex/_generated/api";
import { toast } from "sonner";

export function useCreateIncomingMutation() {
  const mutationFn = useConvexMutation(
    api.queries.movements.createIncoming,
  )

  return useMutation({
    mutationFn,
    onSuccess: () => toast.success('Прихід матеріалу виконано.', { duration: 3000, position: 'top-center' }),
    onError: (e) => toast.error(`Помилка: ${e.message}`, { duration: 3000, position: 'top-center' }),
  })
}

export function useMigrateMutation() {
  const mutationFn = useConvexMutation(
    api.queries.materials.makeMigrateData,
  )

  return useMutation({ mutationFn })
}