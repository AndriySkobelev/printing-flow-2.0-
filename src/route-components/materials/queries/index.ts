import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { api } from "convex/_generated/api";
import { toast } from "sonner";

export function useCreateMaterials() {
  const mutationFn = useConvexMutation(api.queries.materials.createAllMaterials);
  return useMutation({
    mutationFn,
    onSuccess: () => toast.success('Матеріали створено.', { duration: 3000, position: 'top-center' }),
    onError: (e) => toast.error(`Помилка: ${e.message}`, { duration: 3000, position: 'top-center' }),
  });
}

export function useUpdateMaterial() {
  const mutationFn = useConvexMutation(api.queries.materials.updateMaterial);
  return useMutation({
    mutationFn,
    onSuccess: () => toast.success('Матеріал оновлено.', { duration: 3000, position: 'top-center' }),
    onError: (e) => toast.error(`Помилка: ${e.message}`, { duration: 3000, position: 'top-center' }),
  });
}

export function useDeleteMaterial() {
  const mutationFn = useConvexMutation(api.queries.materials.deleteMaterial);
  return useMutation({
    mutationFn,
    onSuccess: () => toast.success('Матеріал видалено.', { duration: 3000, position: 'top-center' }),
    onError: (e) => toast.error(`Помилка: ${e.message}`, { duration: 3000, position: 'top-center' }),
  });
}
