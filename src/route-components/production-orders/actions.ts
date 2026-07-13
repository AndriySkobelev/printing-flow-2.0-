import { useMutation } from '@tanstack/react-query'
import { ConvexError } from 'convex/values'
import { useConvexMutation } from '@convex-dev/react-query'
import { useAction } from 'convex/react'
import { api } from 'convex/_generated/api'
import { toast } from 'sonner'

export const useCreateProductionOrder = (onSuccess?: () => void) =>
  useMutation({
    mutationFn: useConvexMutation(api.queries.orders.createManualProductionOrder),
    onSuccess: () => {
      toast.success('Замовлення створено')
      onSuccess?.()
    },
    onError: (e: Error) => {
     const mesage = e instanceof ConvexError
        ? (e.data as { message: string }).message
        : "Unexpected error occurred";
      toast.error(mesage)
    },
  })

export const useDeleteProductionOrder = () =>
  useMutation({
    mutationFn: useConvexMutation(api.queries.orders.deleteProductionOrder),
    onSuccess: () => toast.success('Замовлення видалено'),
    onError: (e: Error) => toast.error(e.message),
  })

export const useDeleteProductionOrders = (onSuccess?: () => void) =>
  useMutation({
    mutationFn: useConvexMutation(api.queries.orders.deleteProductionOrders),
    onSuccess: () => {
      toast.success('Замовлення видалено')
      onSuccess?.()
    },
    onError: (e: Error) => toast.error(e.message),
  })

export const useSyncKeyCrmOrders = () => {
  const syncKeyCrm = useAction(api.http_actions.orders.getKeyCrmOrders)
  return useMutation({
    mutationFn: () => syncKeyCrm({}),
    onSuccess: () => toast.success('Замовлення синхронізовано з KeyCRM'),
    onError: (e: Error) => toast.error(e.message),
  })
}
