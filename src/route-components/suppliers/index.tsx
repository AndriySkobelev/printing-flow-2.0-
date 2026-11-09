import { useContext } from 'react'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from 'convex/_generated/api'
import { type Doc } from 'convex/_generated/dataModel'
import { type HeaderObject } from 'simple-table-core'
import { SquarePen, Trash2 } from 'lucide-react'
import { DialogContext } from '@/contexts/dialog'
import { Button } from '@/components/ui/button'
import { ActionsMenu } from '@/components/actions-menu'
import AppTable from '@/components/ui/app-table'
import { SupplierForm, type SupplierFormValues } from './forms/supplier-form'
import { useCreateSupplier, useDeleteSupplier, useUpdateSupplier } from './actions'

const FORM_ID = 'supplier-form'

const toHref = (url: string) => (/^https?:\/\//i.test(url) ? url : `https://${url}`)
const toLabel = (url: string) => url.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '')

const Suppliers = () => {
  const { data = [], isLoading } = useQuery(convexQuery(api.queries.suppliers.getSuppliers, {}))
  const { mutate: createSupplier } = useCreateSupplier()
  const { mutate: updateSupplier } = useUpdateSupplier()
  const { mutate: deleteSupplier } = useDeleteSupplier()
  const { openDialog, closeDialog } = useContext(DialogContext)

  const handleCreate = () => {
    const id = openDialog({
      title: 'Додати постачальника',
      formId: FORM_ID,
      withForm: true,
      content: (
        <SupplierForm
          formId={FORM_ID}
          onSubmit={(values: SupplierFormValues) =>
            createSupplier(values, { onSuccess: () => closeDialog(id) })
          }
        />
      ),
    })
  }

  const handleEdit = (supplier: Doc<'suppliers'>) => {
    const id = openDialog({
      title: 'Редагувати постачальника',
      formId: FORM_ID,
      withForm: true,
      content: (
        <SupplierForm
          formId={FORM_ID}
          defaultValues={{
            name:          supplier.name,
            contactPerson: supplier.contactPerson ?? '',
            phone:         supplier.phone ?? '',
            website:       supplier.website ?? '',
            note:          supplier.note ?? '',
          }}
          onSubmit={(values: SupplierFormValues) =>
            updateSupplier({ id: supplier._id, ...values }, { onSuccess: () => closeDialog(id) })
          }
        />
      ),
    })
  }

  const handleDelete = (supplier: Doc<'suppliers'>) => {
    const id = openDialog({
      title: 'Видалити постачальника?',
      content: `${supplier.name} буде видалено. Цю дію неможливо скасувати.`,
      withForm: true,
      actionSubmit: () => {
        deleteSupplier({ id: supplier._id })
        closeDialog(id)
      },
    })
  }

  const headers: HeaderObject[] = [
    { accessor: 'name',          label: 'Назва',           width: 240, type: 'string' },
    { accessor: 'contactPerson', label: 'Контактна особа', width: 200, type: 'string' },
    { accessor: 'phone',         label: 'Телефон',         width: 150, type: 'string' },
    {
      accessor: 'website',
      label: 'Сайт',
      width: 200,
      type: 'string',
      cellRenderer: ({ row }) => {
        const { website } = row as unknown as Doc<'suppliers'>
        if (!website) return null
        return (
          <a
            href={toHref(website)}
            target="_blank"
            rel="noopener noreferrer"
            title={website}
            className="block truncate text-primary hover:underline"
          >
            {toLabel(website)}
          </a>
        )
      },
    },
    { accessor: 'note',          label: 'Примітка',        width: 320, type: 'string' },
    {
      accessor: '_actions',
      label: '',
      width: 40,
      type: 'string',
      cellRenderer: ({ row }) => {
        const supplier = row as unknown as Doc<'suppliers'>
        return (
          <ActionsMenu items={[
            { label: 'Редагувати', icon: <SquarePen className="size-3" />, onClick: () => handleEdit(supplier) },
            { label: 'Видалити', icon: <Trash2 className="size-3" />, destructive: true, onClick: () => handleDelete(supplier) },
          ]} />
        )
      },
    },
  ]

  return (
    <div className="flex h-full flex-col gap-2 p-4">
      <div className="flex justify-end">
        <Button type="button" onClick={handleCreate}>Додати постачальника</Button>
      </div>
      <div className="min-h-0 flex-1">
        <AppTable
          height="100%"
          rows={data}
          isLoading={isLoading}
          defaultHeaders={headers}
          getRowId={({ row }) => row._id as string}
        />
      </div>
    </div>
  )
}

export default Suppliers
