import { useConvexMutation } from "@convex-dev/react-query"
import { useMutation } from "@tanstack/react-query";
import { api } from "convex/_generated/api";


export function useCreateSpecification() {
  const mutationFn = useConvexMutation(
    api.queries.specifications.insertSpecification,
  )

  return useMutation({ mutationFn })
}

export function useUpdateSpecification() {
  const mutationFn = useConvexMutation(
    api.queries.specifications.updateSpecification,
  )

  return useMutation({ mutationFn })
}

export function useDeleteSpecification() {
  const mutationFn = useConvexMutation(
    api.queries.specifications.deleteSpecification,
  )

  return useMutation({ mutationFn })
}