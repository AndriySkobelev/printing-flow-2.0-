import { useConvexMutation } from "@convex-dev/react-query"
import { useMutation } from "@tanstack/react-query";
import { api } from "convex/_generated/api";


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

  return useMutation({ mutationFn })
}


