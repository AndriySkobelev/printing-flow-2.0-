import z from 'zod'
import { revalidateLogic } from '@tanstack/react-form'
import { useAppForm } from '@/components/main-form'

const schema = z.object({
  name:      z.string().min(1, "Введіть ім'я"),
  lastName:  z.string().optional(),
  phone:     z.string().optional(),
  birthday:  z.string().optional(),
  workHours: z.number().min(0).max(24).optional(),
  startDate: z.string().optional(),
})

export type UpdateProfileFormType = z.infer<typeof schema>

interface Props {
  formId: string
  defaultValues?: Partial<UpdateProfileFormType>
  onSubmit: (values: UpdateProfileFormType) => void
}

export default function UpdateProfileForm({ formId, defaultValues, onSubmit }: Props) {
  const form = useAppForm({
    validationLogic: revalidateLogic(),
    validators: { onDynamic: schema },
    defaultValues: defaultValues || {
      name:      '',
      lastName:  '',
      phone:     '',
      birthday:  '',
      workHours: undefined,
      startDate: '',
    },
    onSubmit: ({ value }) => onSubmit(value as UpdateProfileFormType),
  })

  return (
    <form
      id={formId}
      onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }}
      className="flex flex-col gap-3"
    >
      <div className="flex gap-2">
        <form.AppField name="name"     children={(f) => <f.FormTextField label="Ім'я" />} />
        <form.AppField name="lastName" children={(f) => <f.FormTextField label="Прізвище" />} />
      </div>
      <form.AppField name="phone" children={(f) => <f.FormTextField label="Телефон" />} />
      <div className="flex gap-2">
        <form.AppField name="birthday"  children={(f) => <f.FormTextField label="День народження" placeholder="РРРР-ММ-ДД" />} />
        <form.AppField name="startDate" children={(f) => <f.FormTextField label="Дата початку"    placeholder="РРРР-ММ-ДД" />} />
      </div>
      <form.AppField name="workHours" children={(f) => <f.FormTextField label="Робочі години / день" type="number" />} />
    </form>
  )
}