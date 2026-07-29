import { useMutation } from '@tanstack/react-query'
import { useConvexMutation } from '@convex-dev/react-query'
import { useAction } from 'convex/react'
import { api } from 'convex/_generated/api'
import { type Id } from 'convex/_generated/dataModel'
import { toast } from 'sonner'

export const useCreateSpecVariants = () =>
  useMutation({
    mutationFn: useConvexMutation(api.queries.products.createSpecVariants),
    onError: (e: Error) => toast.error(e.message),
    onSuccess: () => toast.success('Варіанти створено'),
  })


export const useBulkUpdateProductMaterials = () =>
  useMutation({
    mutationFn: useConvexMutation(api.queries.products.bulkUpdateProductMaterials),
    onError: (e: Error) => toast.error(e.message),
    onSuccess: () => toast.success('Матеріали збережено'),
  })

export const useMigrateSpecificationToKeyCrm = () => {
  const migrate = useAction(api.http_actions.products.migrateSpecificationToKeyCrm)
  return useMutation({
    mutationFn: (args: { specificationId: Id<'specifications'>; productIds?: Id<'products'>[] }) => migrate(args),
    onSuccess: (result: { productCreated: boolean; offersCreated: number; skipped: Array<{ sku: string; reason: string }> }) => {
      if (result.skipped.length > 0) {
        toast.error(`Мігровано ${result.offersCreated}, пропущено ${result.skipped.length}: ${result.skipped.map(s => s.sku).join(', ')}`)
      } else if (result.offersCreated > 0) {
        toast.success(`Мігровано ${result.offersCreated} варіант(ів) у KeyCRM`)
      } else {
        toast.success('Нічого нового для міграції')
      }
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export const useUploadSpecFile = (specificationId: string) => {
  const { mutateAsync: getUploadUrl } = useMutation({
    mutationFn: useConvexMutation(api.queries.specifications.generateSpecFileUploadUrl),
  })
  const { mutateAsync: addFile } = useMutation({
    mutationFn: useConvexMutation(api.queries.specifications.addSpecAttachedFile),
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
        specificationId: specificationId as Id<'specifications'>,
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
