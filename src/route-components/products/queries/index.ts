import { useConvexMutation } from "@convex-dev/react-query"
import { useMutation } from "@tanstack/react-query";
import { api } from "convex/_generated/api";
import { toast } from "sonner";


export function useCreateProducts() {
  const mutationFn = useConvexMutation(
    api.queries.products.createProductsBySpecification,
  )

  return useMutation({
    mutationFn,
    onSuccess: () => toast.success('Продукт створено.', { duration: 3000, position: 'top-center' }),
    onError: (e) => toast.error(`Помилка: ${e.message}`, { duration: 3000, position: 'top-center' }),
  })
}

export function useUpdateProducts() {
  const mutationFn = useConvexMutation(
    api.queries.products.updateProducts,
  )

  return useMutation({
    mutationFn,
    onSuccess: () => toast.success('Продукт оновлено.', { duration: 3000, position: 'top-center' }),
    onError: (e) => toast.error(`Помилка: ${e.message}`, { duration: 3000, position: 'top-center' }),
  })
}


