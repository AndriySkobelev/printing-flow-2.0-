import { useCallback, useContext } from 'react'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from 'convex/_generated/api'
import { type Doc } from 'convex/_generated/dataModel'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ActionsMenu } from '@/components/actions-menu'
import { DialogContext } from '@/contexts/dialog'
import { useCreateExtraWork, useUpdateExtraWork, useDeleteExtraWork } from '../actions'
import { ExtraWorkForm } from '../forms/extra-work-form'

export const ExtraWorksSection = () => {
  const { data: works = [] } = useQuery(convexQuery(api.queries.extraWorks.getExtraWorks, {}))
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
          defaultValues={{ name: work.name, minutesPerUnit: work.minutesPerUnit }}
          onSubmit={async (values) => {
            await updateWork({ extraWorkId: work._id, ...values })
            closeDialog(id)
          }}
        />
      ),
    })
  }, [openDialog, closeDialog, updateWork])

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Додаткові роботи</span>
        <Button size="sm" variant="outline" className="h-6 text-[11px] px-2" onClick={handleAdd}>
          <Plus size={10} className="mr-1" /> Додати
        </Button>
      </div>
      <span className="text-xs text-muted-foreground">
        Роботи, які можна додати до виробу в планері. Норма часу на 1 шт додається до тривалості пошиву.
      </span>

      <div className="flex flex-col border rounded-md divide-y">
        {works.length === 0 && (
          <p className="text-xs text-muted-foreground px-3 py-2">Довідник порожній</p>
        )}
        {works.map(work => (
          <div key={work._id} className="flex items-center gap-3 px-3 py-2 text-sm">
            <span className="flex-1 truncate">{work.name}</span>
            <span className="text-xs text-muted-foreground tabular-nums shrink-0">{`${work.minutesPerUnit} хв/шт`}</span>
            <ActionsMenu
              items={[
                { label: 'Редагувати', icon: <Pencil className="size-3" />, onClick: () => handleEdit(work) },
                { label: 'Видалити',   icon: <Trash2 className="size-3" />, onClick: () => deleteWork({ extraWorkId: work._id }), destructive: true },
              ]}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
