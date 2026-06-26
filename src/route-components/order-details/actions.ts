import { useMutation } from '@tanstack/react-query'
import { useConvexMutation } from '@convex-dev/react-query'
import { api } from 'convex/_generated/api'
import { type Id } from 'convex/_generated/dataModel'
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

export const useUpdateOrderItemDestination = () =>
  useMutation({
    mutationFn: useConvexMutation(api.queries.orders.updateOrderItemDestination),
    onError: (e: Error) => toast.error(e.message),
    onSuccess: () => toast.success('Збережено'),
  })

export const useSplitOrderItem = () =>
  useMutation({
    mutationFn: useConvexMutation(api.queries.orders.splitOrderItem),
    onError: (e: Error) => toast.error(e.message),
    onSuccess: () => toast.success('Товар розділено'),
  })

export const useAddProductionOrderItems = () =>
  useMutation({
    mutationFn: useConvexMutation(api.queries.orders.addProductionOrderItems),
    onError: (e: Error) => toast.error(e.message),
    onSuccess: () => toast.success('Товари додано'),
  })

export const useUpdateOrderItem = () =>
  useMutation({
    mutationFn: useConvexMutation(api.queries.orders.updateOrderItem),
    onError: (e: Error) => toast.error(e.message),
    onSuccess: () => toast.success('Збережено'),
  })

export const useCreateSubcontractorTask = () =>
  useMutation({
    mutationFn: useConvexMutation(api.queries.orders.createSubcontractorTask),
    onError: (e: Error) => toast.error(e.message),
    onSuccess: () => toast.success('Завдання створено'),
  })

export const useUpdateSubcontractorTaskActualDates = () =>
  useMutation({
    mutationFn: useConvexMutation(api.queries.orders.updateSubcontractorTaskActualDates),
    onError: (e: Error) => toast.error(e.message),
    onSuccess: () => toast.success('Дати збережено'),
  })

export const useDeleteSubcontractorTask = () =>
  useMutation({
    mutationFn: useConvexMutation(api.queries.orders.deleteSubcontractorTask),
    onError: (e: Error) => toast.error(e.message),
    onSuccess: () => toast.success('Завдання видалено'),
  })

export const useUpdateSubcontractorTaskStatus = () =>
  useMutation({
    mutationFn: useConvexMutation(api.queries.orders.updateSubcontractorTaskStatus),
    onError: (e: Error) => toast.error(e.message),
  })

export const useCreateProductionTasks = () =>
  useMutation({
    mutationFn: useConvexMutation(api.queries.orders.createProductionTasks),
    onError: (e: Error) => toast.error(e.message),
    onSuccess: () => toast.success('Завдання створено'),
  })

export const useUploadOrderFile = (productionOrderId: string) => {
  const { mutateAsync: getUploadUrl } = useMutation({
    mutationFn: useConvexMutation(api.queries.orders.generateOrderFileUploadUrl),
  })
  const { mutateAsync: addFile } = useMutation({
    mutationFn: useConvexMutation(api.queries.orders.addAttachedFile),
  })

  return async (file: File, name?: string): Promise<{ url: string; name: string; contentType?: string }> => {
    try {
      const uploadUrl = await getUploadUrl({})
      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      })
      const { storageId } = await res.json()
      const result = await addFile({
        productionOrderId: productionOrderId as Id<'productionOrders'>,
        storageId,
        name: name ?? file.name,
        contentType: file.type || undefined,
      }) as { url: string; name: string; contentType?: string }
      toast.success(`${result.name} завантажено`)
      return result
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Помилка завантаження файлу')
      throw e
    }
  }
}
