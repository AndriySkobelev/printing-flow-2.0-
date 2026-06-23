import z from 'zod'
import { revalidateLogic } from '@tanstack/react-form'
import { Loader2 } from 'lucide-react'
import { useAppForm } from '@/components/main-form'
import { Button } from '@/components/ui/button'
import { UTCDate } from '@date-fns/utc'

const schema = z.object({
  name:               z.string().min(1, { message: "Обов'язкове поле" }),
  type:               z.union([z.literal('sublimation'), z.literal('embroidery'), z.literal('silkscreen'), z.literal('dtg'), z.literal('dtf'), z.literal('other')]),
  quantity:           z.string().optional(),
  expectedSentDate:   z.number(),
  expectedReturnDate: z.number({ error: "Обов'язкове поле" }),
  status:             z.union([z.literal('sent'), z.literal('in_progress'), z.literal('returned'), z.literal('delayed'), z.literal('waiting_to_sent')]),
  note:               z.string().optional(),
})

export type SubcontractorTaskFormValues = z.infer<typeof schema>

const typeOptions = [
  { value: 'sublimation', label: 'Сублімація' },
  { value: 'embroidery',  label: 'Вишивка'    },
  { value: 'silkscreen',  label: 'Шовкодрук'  },
  { value: 'dtg',         label: 'DTG'         },
  { value: 'dtf',         label: 'DTF'         },
  { value: 'other',       label: 'Інше'        },
]

const statusOptions = [
  { value: 'sent',        label: 'Відправлено' },
  { value: 'waiting_to_sent', label: 'Очікує відправки' },
  { value: 'in_progress', label: 'В процесі'  },
  { value: 'returned',    label: 'Повернено'  },
  { value: 'delayed',     label: 'Затримано'  },
]

type Props = {
  defaultValues?: Partial<SubcontractorTaskFormValues>
  onSubmit: (values: SubcontractorTaskFormValues) => void
}

export const SubcontractorTaskForm = ({ onSubmit, defaultValues }: Props) => {
  const form = useAppForm({
    validationLogic: revalidateLogic(),
    validators: { onDynamic: schema },
    defaultValues: {
      name:             '',
      type:             'other' as const,
      expectedSentDate: new UTCDate().valueOf(),
      expectedReturnDate: new UTCDate().valueOf(),
      status:           'sent' as const,
      ...defaultValues,
    },
    onSubmit: ({ value }) => {
      onSubmit(value)
      form.reset()
    },
  })

  return (
    <form
      onSubmit={e => { e.preventDefault(); form.handleSubmit() }}
      className="flex flex-col gap-4 w-full"
    >
      <div className="grid grid-cols-2 gap-3">
        <form.AppField name="name"     children={f => <f.FormTextField label="Назва" />} />
        <form.AppField name="status" children={f => <f.FormSelect label="Статус" options={statusOptions} />} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <form.AppField name="type"     children={f => <f.FormSelect label="Тип" options={typeOptions} />} />
        <form.AppField name="quantity" children={f => <f.FormTextField label="Кількість" type="number" />} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <form.AppField name="expectedSentDate"   children={f => <f.InputDate label="Очікувана відправка" />} />
        <form.AppField name="expectedReturnDate" children={f => <f.InputDate label="Очікуване отримання" />} />
      </div>

      <form.AppField name="note"   children={f => <f.TextAreaField placeholder="Примітка…" />} />

      <form.Subscribe selector={s => [s.canSubmit, s.isSubmitting] as const}>
        {([canSubmit, isSubmitting]) => (
          <Button type="submit" disabled={!canSubmit || isSubmitting}>
            {isSubmitting
              ? <><Loader2 className="size-4 animate-spin mr-1" /> Збереження…</>
              : 'Створити'
            }
          </Button>
        )}
      </form.Subscribe>
    </form>
  )
}
