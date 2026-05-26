import { useMutation } from '@tanstack/react-query'
import { useConvexMutation } from '@convex-dev/react-query'
import { api } from 'convex/_generated/api'
import { toast } from 'sonner'

export const useUpdateOrderItemBrandingType = () =>
  useMutation({
    mutationFn: useConvexMutation(api.queries.orders.updateOrderItemBrandingType),
    onError: (e: Error) => toast.error(e.message),
    onSuccess: () => toast.success('Збережено'),
  })

export const useUpdateOrderItemCuttingBrandingType = () =>
  useMutation({
    mutationFn: useConvexMutation(api.queries.orders.updateOrderItemCuttingBrandingType),
    onError: (e: Error) => toast.error(e.message),
    onSuccess: () => toast.success('Збережено'),
  })

export const useUpdateAllOrderItemsBrandingType = () =>
  useMutation({
    mutationFn: useConvexMutation(api.queries.orders.updateAllOrderItemsBrandingType),
    onError: (e: Error) => toast.error(e.message),
    onSuccess: () => toast.success('Застосовано до всіх'),
  })

export const useUpdateOrderItemComment = () =>
  useMutation({
    mutationFn: useConvexMutation(api.queries.orders.updateOrderItemComment),
    onError: (e: Error) => toast.error(e.message),
  })
