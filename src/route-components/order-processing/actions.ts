import { useContext } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useAction } from 'convex/react'
import { useConvexMutation } from '@convex-dev/react-query'
import { type FunctionArgs } from 'convex/server'
import { type Id } from 'convex/_generated/dataModel'
import { api } from 'convex/_generated/api'
import { toast } from 'sonner'
import { DialogContext } from '@/contexts/dialog'

export const useLookupRegistration = () => {
  const lookup = useAction(api.http_actions.opendatabot.lookupRegistration)
  return useMutation({
    mutationFn: (code: string) => lookup({ code }),
    onError: (e: Error) => toast.error(e.message),
  })
}

type SaveInvoiceArgs = Omit<FunctionArgs<typeof api.queries.invoices.saveInvoice>, 'storageId'>

const useUploadPdf = () => {
  const getUploadUrl = useConvexMutation(api.queries.invoices.generateInvoiceUploadUrl)
  return async (blob: Blob) => {
    const res = await fetch(await getUploadUrl({}), { method: 'POST', headers: { 'Content-Type': 'application/pdf' }, body: blob })
    if (!res.ok) throw new Error('Не вдалося завантажити PDF')
    return (await res.json() as { storageId: Id<'_storage'> }).storageId
  }
}

// Uploads the invoice PDF and saves it with the form — returns the invoice id.
export const useSaveInvoicePdf = () => {
  const upload = useUploadPdf()
  const save   = useConvexMutation(api.queries.invoices.saveInvoice)
  return useMutation({
    mutationFn: async ({ blob, ...args }: SaveInvoiceArgs & { blob: Blob }) => save({ ...args, storageId: await upload(blob) }),
    onError: (e: Error) => toast.error(e.message),
  })
}

type SaveWaybillArgs = Omit<FunctionArgs<typeof api.queries.invoices.saveWaybill>, 'storageId'>

// Uploads a waybill PDF onto a saved invoice, leaving the invoice's data alone.
export const useSaveWaybillPdf = () => {
  const upload = useUploadPdf()
  const save   = useConvexMutation(api.queries.invoices.saveWaybill)
  return useMutation({
    mutationFn: async ({ blob, ...args }: SaveWaybillArgs & { blob: Blob }) => save({ ...args, storageId: await upload(blob) }),
    onError: (e: Error) => toast.error(e.message),
  })
}

export const useConfirmDeleteInvoice = () => {
  const { openDialog, closeDialog, setIsLoading } = useContext(DialogContext)
  const { mutate: remove } = useMutation({
    mutationFn: useConvexMutation(api.queries.invoices.deleteInvoice),
    onError: (e: Error) => toast.error(e.message),
  })
  return (invoice: { _id: Id<'invoices'>; orderNumber: string }, onDeleted?: () => void) => {
    const id = openDialog({
      title:        `Видалити рахунок № ${invoice.orderNumber || 'б/н'}?`,
      description:  'Буде видалено дані рахунку та його PDF. Цю дію не можна скасувати.',
      content:      null,
      withForm:     true,
      actionSubmit: () => {
        setIsLoading(true)
        remove({ id: invoice._id }, {
          onSuccess: () => { closeDialog(id); onDeleted?.() },
          onSettled: () => setIsLoading(false),
        })
      },
    })
  }
}

export const useUpdatePrintPricing = () =>
  useMutation({
    mutationFn: useConvexMutation(api.queries.settings.updatePrintPricing),
    onSuccess: () => toast.success('Ціни друку збережено'),
    onError: (e: Error) => toast.error(e.message),
  })
