import { useConvexMutation } from "@convex-dev/react-query"
import { useMutation } from "@tanstack/react-query";
import { api } from "convex/_generated/api";
import { toast } from "sonner";

export const useCreateFabric = () =>
  useMutation({
    mutationFn: useConvexMutation(api.queries.fabrics.createFabric),
    onSuccess: () => toast.success('Тканину створено'),
    onError: (e: Error) => toast.error(e.message),
  })

export const useAddFabricVariant = () =>
  useMutation({
    mutationFn: useConvexMutation(api.queries.fabrics.addFabricVariant),
    onSuccess: () => toast.success('Колір додано'),
    onError: (e: Error) => toast.error(e.message),
  })

export const useAddFabricVariants = () =>
  useMutation({
    mutationFn: useConvexMutation(api.queries.fabrics.addFabricVariants),
    onSuccess: () => toast.success('Кольори додано'),
    onError: (e: Error) => toast.error(e.message),
  })

export const useUpdateFabric = () =>
  useMutation({
    mutationFn: useConvexMutation(api.queries.fabrics.updateFabric),
    onSuccess: () => toast.success('Збережено'),
    onError: (e: Error) => toast.error(e.message),
  })

export const useUpdateFabricVariant = () =>
  useMutation({
    mutationFn: useConvexMutation(api.queries.fabrics.updateFabricVariant),
    onSuccess: () => toast.success('Збережено'),
    onError: (e: Error) => toast.error(e.message),
  })

export const useDeleteFabric = () =>
  useMutation({
    mutationFn: useConvexMutation(api.queries.fabrics.deleteFabric),
    onSuccess: () => toast.success('Тканину видалено'),
    onError: (e: Error) => toast.error(e.message),
  })

export const useDeleteFabricVariant = () =>
  useMutation({
    mutationFn: useConvexMutation(api.queries.fabrics.deleteFabricVariant),
    onSuccess: () => toast.success('Колір видалено'),
    onError: (e: Error) => toast.error(e.message),
  })

// kept for backwards-compat — no-op now
export const useCreateFabricsName = () =>
  useMutation({
    mutationFn: useConvexMutation(api.queries.fabrics.migrateFabricsAddName),
  })

export const useUpdateType = () =>
  useMutation({
    mutationFn: useConvexMutation(api.queries.fabrics.migrateFleeceProcessingType),
    onSuccess: () => toast.success('Оновлено'),
    onError: (e: Error) => toast.error(e.message),
  })

// legacy alias
export const useCreateFabrics = useCreateFabric
