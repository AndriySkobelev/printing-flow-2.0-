import z from 'zod'
import { revalidateLogic } from '@tanstack/react-form'
import { Loader2 } from 'lucide-react'
import { useAppForm } from '@/components/main-form'
import { Button } from '@/components/ui/button'
import { UTCDate } from '@date-fns/utc'

const schema = z.object({
  actualSentDate:   z.number(),
  actualReturnDate: z.number().nullable().optional(),
})

export type ActualDatesFormValues = z.infer<typeof schema>

type Props = {
  defaultValues?: Partial<ActualDatesFormValues>
  onSubmit: (values: ActualDatesFormValues) => void
}

export const ActualDatesForm = ({ onSubmit, defaultValues }: Props) => {
  const form = useAppForm({
    validationLogic: revalidateLogic(),
    validators: { onDynamic: schema },
    defaultValues: { actualSentDate: new UTCDate().valueOf(), ...defaultValues },
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
        <form.AppField name="actualSentDate"   children={f => <f.InputDate label="Фактична відправка" />} />
        <form.AppField name="actualReturnDate" children={f => <f.InputDate label="Фактичне отримання" />} />
      </div>

      <form.Subscribe selector={s => [s.canSubmit, s.isSubmitting] as const}>
        {([canSubmit, isSubmitting]) => (
          <Button type="submit" disabled={!canSubmit || isSubmitting}>
            {isSubmitting
              ? <><Loader2 className="size-4 animate-spin mr-1" /> Збереження…</>
              : 'Зберегти'
            }
          </Button>
        )}
      </form.Subscribe>
    </form>
  )
}
