import { useContext } from 'react'
import clsx from 'clsx'
import { PlusIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DialogContext } from '@/contexts/dialog'
import LogForm, { type LogFormType } from '../forms/logs'
import { useAddCuttingTaskSizeLog } from '../queries'
import type { SizeDetail } from '../index'

const FORM_ID = 'cutting-size-log-form'

type Props = {
  detail: SizeDetail
}

export function SizeInfo({ detail }: Props) {
  const { _id, size, quantity, completedQty, logs = [] } = detail
  const { openDialog, closeDialog, setIsLoading } = useContext(DialogContext)

  const { mutate } = useAddCuttingTaskSizeLog(() => { setIsLoading(false); closeDialog() })

  const progress = quantity > 0 ? Math.round((completedQty / quantity) * 100) : 0
  const isDone = completedQty >= quantity

  function handleOpenDialog() {
    openDialog({
      title: `Розмір ${size} — додати виготовлені`,
      withForm: true,
      formId: FORM_ID,
      content: (
        <LogForm
          formId={FORM_ID}
          defaultValues={{ completedQty: '', comment: '' }}
          actionSubmit={(values: LogFormType) => {
            setIsLoading(true)
            mutate({
              cuttingTaskSizeId: _id as any,
              quantity: Number(values.completedQty),
              comment: values.comment || undefined,
            })
          }}
        />
      ),
    })
  }

  return (
    <div className="flex flex-col gap-2 min-w-[200px]">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-semibold">{size}</span>
        <span className={clsx('text-xs font-medium', isDone ? 'text-green-600' : 'text-muted-foreground')}>
          {completedQty} / {quantity}
        </span>
      </div>

      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={clsx('h-full rounded-full transition-all', isDone ? 'bg-green-500' : 'bg-primary')}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>

      {logs.length > 0 && (
        <div className="flex flex-col gap-1 border-t pt-2 mt-0.5">
          <span className="text-xs text-muted-foreground font-medium">Історія</span>
          {logs.map((log, i) => (
            <div key={i} className="flex flex-col items-start justify-between gap-0.5 text-xs">
              <div className='flex items-center justify-between w-full'>
                <span className="text-muted-foreground">
                  {new Date(log.timestamp).toLocaleDateString('uk', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="font-medium">+{log.quantity}</span>
              </div>
              {log.comment && (
                <span className="text-muted-foreground truncate max-w-[100px] italic self-end">{log.comment}</span>
              )}
            </div>
          ))}
        </div>
      )}

      <Button size="sm" variant="outline" className="mt-1 w-full" onClick={handleOpenDialog}>
        <PlusIcon size={13} />
        Додати виготовлені
      </Button>
    </div>
  )
}
