import { useMutation } from '@tanstack/react-query'
import { useConvexMutation } from '@convex-dev/react-query'
import { api } from 'convex/_generated/api'
import { type Id } from 'convex/_generated/dataModel'
import { toast } from 'sonner'

export const useCreateSpecVariants = () =>
  useMutation({
    mutationFn: useConvexMutation(api.queries.products.createSpecVariants),
    onError: (e: Error) => toast.error(e.message),
    onSuccess: () => toast.success('Варіанти створено'),
  })

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
