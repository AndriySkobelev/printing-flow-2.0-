import z from 'zod'
import { useAppForm } from '@/components/main-form'
import { revalidateLogic } from '@tanstack/react-form'

const formSchema = z.object({
  completedQty: z.string().min(1, 'Введіть кількість'),
  comment: z.string().optional(),
})

export type LogFormType = z.infer<typeof formSchema>

interface Props {
  formId: string
  defaultValues: LogFormType
  actionSubmit: (values: LogFormType) => void
}

const LogForm = ({ formId, defaultValues, actionSubmit }: Props) => {
  const form = useAppForm({
    validationLogic: revalidateLogic(),
    validators: { onDynamic: formSchema },
    defaultValues,
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
          <field.FormTextField
            label="Додати виготовлених"
            type="number"
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