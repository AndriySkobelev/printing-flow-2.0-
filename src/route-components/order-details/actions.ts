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

export const useUpdateOrderItemBrandingComment = () =>
  useMutation({
    mutationFn: useConvexMutation(api.queries.orders.updateOrderItemBrandingComment),
    onError: (e: Error) => toast.error(e.message),
  })

export const useUpdateOrderItemSewingComment = () =>
  useMutation({
    mutationFn: useConvexMutation(api.queries.orders.updateOrderItemSewingComment),
    onError: (e: Error) => toast.error(e.message),
  })

export const useUpdateSelectedOrderItemsBrandingType = () =>
  useMutation({
    mutationFn: useConvexMutation(api.queries.orders.updateSelectedOrderItemsBrandingType),
    onError: (e: Error) => toast.error(e.message),
    onSuccess: () => toast.success('Застосовано до вибраних'),
  })

export const useAddProductionOrderItems = () =>
  useMutation({
    mutationFn: useConvexMutation(api.queries.orders.addProductionOrderItems),
    onError: (e: Error) => toast.error(e.message),
    onSuccess: () => toast.success('Товари додано'),
  })
