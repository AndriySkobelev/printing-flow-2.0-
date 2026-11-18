import z from 'zod'
import { revalidateLogic } from '@tanstack/react-form'
import { useAppForm } from '@/components/main-form'

const formSchema = z.object({
  name: z.string().trim().min(1),
  contactPerson: z.string(),
  phone: z.string(),
  website: z.string().trim(),
  note: z.string(),
})

export type SupplierFormValues = z.infer<typeof formSchema>

const EMPTY: SupplierFormValues = { name: '', contactPerson: '', phone: '', website: '', note: '' }

export const SupplierForm = ({ formId, defaultValues = EMPTY, onSubmit }: {
  formId: string
  defaultValues?: SupplierFormValues
  onSubmit: (values: SupplierFormValues) => void
}) => {
  const form = useAppForm({
    validationLogic: revalidateLogic(),
    validators: { onDynamic: formSchema },
    defaultValues,
    onSubmit: ({ value }) => onSubmit(value),
  })

  return (
    <form
      id={formId}
      onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }}
      className="flex flex-col gap-3"
    >
      <form.AppField name="name" children={(f) => <f.FormTextField label="Назва" />} />
      <div className="flex items-end gap-2">
        <form.AppField name="contactPerson" children={(f) => <f.FormTextField label="Контактна особа" />} />
        <form.AppField name="phone" children={(f) => <f.FormTextField label="Телефон" />} />
      </div>
      <form.AppField name="website" children={(f) => <f.FormTextField label="Сайт" />} />
      <form.AppField name="note" children={(f) => <f.FormTextField label="Примітка" />} />
    </form>
  )
}
