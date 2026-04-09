import { useConvexMutation } from "@convex-dev/react-query"
import { useMutation } from "@tanstack/react-query";
import { api } from "convex/_generated/api";
import { toast } from "sonner";

export function useCreateSpecification() {
  const mutationFn = useConvexMutation(
    api.queries.specifications.insertSpecification,
  )

  return useMutation({
    mutationFn,
    onSuccess: () => {
      toast.success('Специфікація створена.', {
        duration: 3000,
        position: 'top-center',
      },)
    },
    onError: (error) => {
      toast.error(`Помилка при створенні: ${error.message}`, {
        duration: 3000,
        position: 'top-center',
      },)
    },
  })
}

export function useUpdateSpecification() {
  const mutationFn = useConvexMutation(
    api.queries.specifications.updateSpecification,
  )

  return useMutation({
    mutationFn,
    onSuccess: () => {
      toast.success('Специфікація оновлена', {
        duration: 3000,
        position: 'top-center',
      },)
    },
    onError: (error) => {
      toast.error(`Помилка при оновленні: ${error.message}`, {
        duration: 3000,
        position: 'top-center',
      },)
    },
  })
}

export function useDeleteSpecification() {
  const mutationFn = useConvexMutation(
    api.queries.specifications.deleteSpecification,
  )

  return useMutation({
    mutationFn,
    onSuccess: () => {
      toast.success('Специфікація видалена.', {
        duration: 3000,
        position: 'top-center',
      },)
    },
    onError: (error) => {
      toast.error(`Помилка при видаленні: ${error.message}`, {
        duration: 3000,
        position: 'top-center',
      },)
    },
  })
}

export function useDuplicateSpecification() {
  const mutationFn = useConvexMutation(
    api.queries.specifications.duplicateSpecification,
  )

  return useMutation({
    mutationFn,
    onSuccess: () => {
      toast.success('Специфікація продубльована', {
        duration: 3000,
        position: 'top-center',
      },)
    },
    onError: (error) => {
      toast.error(`Помилка при дублюванні: ${error.message}`, {
        duration: 3000,
        position: 'top-center',
      },)
    },
  })
}