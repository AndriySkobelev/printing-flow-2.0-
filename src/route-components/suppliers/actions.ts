import { useConvexMutation } from '@convex-dev/react-query'
import { useMutation } from '@tanstack/react-query'
import { api } from 'convex/_generated/api'
import { toast } from 'sonner'

export const useCreateSupplier = () =>
  useMutation({
    mutationFn: useConvexMutation(api.queries.suppliers.createSupplier),
    onSuccess: () => toast.success('Постачальника додано'),
    onError: (e: Error) => toast.error(e.message),
  })

export const useUpdateSupplier = () =>
  useMutation({
    mutationFn: useConvexMutation(api.queries.suppliers.updateSupplier),
    onSuccess: () => toast.success('Збережено'),
    onError: (e: Error) => toast.error(e.message),
  })

export const useDeleteSupplier = () =>
  useMutation({
    mutationFn: useConvexMutation(api.queries.suppliers.deleteSupplier),
    onSuccess: () => toast.success('Постачальника видалено'),
    onError: (e: Error) => toast.error(e.message),
  })
