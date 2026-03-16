import { useConvexMutation } from "@convex-dev/react-query"
import { useMutation } from "@tanstack/react-query";
import { api } from "convex/_generated/api";


export function useCreateProducts() {
  const mutationFn = useConvexMutation(
    api.queries.products.createProductsBySpecification,
  )

  return useMutation({ mutationFn })
}

export function useUpdateProducts() {
  const mutationFn = useConvexMutation(
    api.queries.products.updateProducts,
  )

  return useMutation({ mutationFn })
}


