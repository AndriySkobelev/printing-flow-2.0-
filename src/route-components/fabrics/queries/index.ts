import { useConvexMutation } from "@convex-dev/react-query"
import { useMutation } from "@tanstack/react-query";
import { api } from "convex/_generated/api";
import { toast } from "sonner";


export function useCreateFabrics() {
  const mutationFn = useConvexMutation(
    api.queries.fabrics.createFabrics,
  )

  return useMutation({ mutationFn })
}

export function useCreateFabricsName() {
  const mutationFn = useConvexMutation(
    api.queries.fabrics.migrateFabricsAddName,
  )

  return useMutation({
    mutationFn,
    onSuccess: () => {
      toast.success('Назви успішно додані до всіх тканин!');
    },
    onError: (error) => {
      toast.error(`Помилка при додаванні назв до тканин: ${error.message}`);
    },
  })
}


