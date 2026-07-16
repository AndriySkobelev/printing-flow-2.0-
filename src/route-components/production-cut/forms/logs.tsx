import z from 'zod'
import { useAppForm } from '@/components/main-form'
import { revalidateLogic } from '@tanstack/react-form'

const formSchema = z.object({
  completedQty: z.number().min(1, 'Введіть кількість'),
  comment: z.string(),
})

export type LogFormType = z.infer<typeof formSchema>

interface Props {
  formId: string
  max: number
  actionSubmit: (values: LogFormType) => void
}

const LogForm = ({ formId, max, actionSubmit }: Props) => {
  const form = useAppForm({
    validationLogic: revalidateLogic(),
    validators: { onDynamic: formSchema },
    defaultValues: {
      completedQty: 1,
      comment: '',
    },
    onSubmit: ({ value }) => actionSubmit(value as LogFormType),
  })

  return (
    <form
      id={formId}
      onSubmit={e => { e.preventDefault(); form.handleSubmit() }}
      className="flex flex-col gap-3"
    >
      <form.AppField
        name="completedQty"
        children={field => (
          <field.FormInputNumber
            label="Додати виготовлених"
            max={max}
          />
        )}
      />
      <form.AppField
        name="comment"
        children={field => (
          <field.TextAreaField placeholder="Коментар (необов'язково)" />
        )}
      />
    </form>
  )
}

export default LogForm