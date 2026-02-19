import { useConvexMutation } from "@convex-dev/react-query"
import { useMutation } from "@tanstack/react-query";
import { api } from "convex/_generated/api";


export function useCreateMaterial() {
  const mutationFn = useConvexMutation(
    api.materials.createMaterial,
  )

  return useMutation({ mutationFn })
}

export function useCreateAllMaterials() {
  const mutationFn = useConvexMutation(
    api.materials.createAllMaterials,
  )

  return useMutation({ mutationFn })
}


