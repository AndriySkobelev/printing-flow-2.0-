import { useConvexMutation } from "@convex-dev/react-query"
import { useMutation } from "@tanstack/react-query";
import { api } from "convex/_generated/api";


export function useMaterialsByFilter() {
  const mutationFn = useConvexMutation(
    api.materials.createIncoming,
  )

  return useMutation({ mutationFn })
}