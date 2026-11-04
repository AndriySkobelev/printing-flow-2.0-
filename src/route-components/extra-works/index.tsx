import { useCallback, useContext } from 'react'
import { type HeaderObject } from 'simple-table-core'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from 'convex/_generated/api'
import { type Doc, type Id } from 'convex/_generated/dataModel'
import { SquarePen, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ActionsMenu } from '@/components/actions-menu'
import AppTable from '@/components/ui/app-table'
import { DialogContext } from '@/contexts/dialog'
import { useCreateExtraWork, useUpdateExtraWork, useDeleteExtraWork } from './actions'
import { ExtraWorkForm } from './forms/extra-work-form'

const headers = (
  onEdit: (row: Doc<'extraWorks'>) => void,
  onDelete: (id: Id<'extraWorks'>) => void,
): HeaderObject[] => [
  { accessor: 'name',           label: 'Назва',      width: 280,   isSortable: true, type: 'string' },
  {
    accessor:     'minutesPerUnit',
    label:        'Час',
    width:        130,
    isSortable:   true,
    type:         'number',
    cellRenderer: ({ row }) => `${(row as Doc<'extraWorks'>).minutesPerUnit} хв`,
  },
  {
    accessor:     'price',
    label:        'Ціна',
    width:        130,
    isSortable:   true,
    type:         'number',
    cellRenderer: ({ row }) => {
      const { price } = row as Doc<'extraWorks'>
      return price != null ? `${price} грн` : '—'
    },
  },
  {
    accessor:     '_actions',
    label:        '',
    width:        50,
    type:         'other',
    pinned:       'right',
    cellRenderer: ({ row }) => (
      <ActionsMenu items={[
        { label: 'Редагувати', icon: <SquarePen className="size-3" />, onClick: () => onEdit(row as Doc<'extraWorks'>) },
        { label: 'Видалити',   icon: <Trash2 className="size-3" />, destructive: true, onClick: () => onDelete((row as Doc<'extraWorks'>)._id) },
      ]} />
    ),
  },
]

const ExtraWorksPage = () => {
  const { data = [], isLoading } = useQuery(convexQuery(api.queries.extraWorks.getExtraWorks, {}))
  const { mutateAsync: createWork } = useCreateExtraWork()
  const { mutateAsync: updateWork } = useUpdateExtraWork()
  const { mutate: deleteWork }      = useDeleteExtraWork()
  const { openDialog, closeDialog } = useContext(DialogContext)

  const handleAdd = useCallback(() => {
    const id = openDialog({
      title:   'Нова робота',
      content: (
        <ExtraWorkForm
          onSubmit={async (values) => {
            await createWork(values)
            closeDialog(id)
          }}
        />
      ),
    })
  }, [openDialog, closeDialog, createWork])

  const handleEdit = useCallback((work: Doc<'extraWorks'>) => {
    const id = openDialog({
      title:   'Редагувати роботу',
      content: (
        <ExtraWorkForm
          defaultValues={{ name: work.name, minutesPerUnit: work.minutesPerUnit, price: work.price }}
          onSubmit={async (values) => {
            await updateWork({ extraWorkId: work._id, ...values })
            closeDialog(id)
          }}
        />
      ),
    })
  }, [openDialog, closeDialog, updateWork])

  const handleDelete = useCallback((extraWorkId: Id<'extraWorks'>) => {
    openDialog({
      title:        'Видалити роботу?',
      content:      'Роботу буде видалено з довідника. Цю дію неможливо скасувати.',
      withForm:     true,
      actionSubmit: () => {
        deleteWork({ extraWorkId })
        closeDialog()
      },
    })
  }, [openDialog, closeDialog, deleteWork])

  return (
    <div className="flex flex-col gap-4 p-4">
      <AppTable
        height={600}
        rows={data}
        isLoading={isLoading}
        withSearch
        toolbar={<Button type="button" onClick={handleAdd}>Додати роботу</Button>}
        searchPlaceholder="Пошук..."
        columnSearch={['name']}
        defaultHeaders={headers(handleEdit, handleDelete)}
        getRowId={({ row }) => row._id as string}
      />
    </div>
  )
}

export default ExtraWorksPage
