import z from 'zod'
import { revalidateLogic } from '@tanstack/react-form'
import { Loader2 } from 'lucide-react'
import { useAppForm } from '@/components/main-form'
import { Button } from '@/components/ui/button'

const schema = z.object({
  name:           z.string().trim().min(1, 'Вкажіть назву'),
  minutesPerUnit: z.string().refine(v => Number(v) > 0, 'Більше 0'),
})

export type ExtraWorkFormValues = { name: string; minutesPerUnit: number }

type Props = {
  defaultValues?: ExtraWorkFormValues
  onSubmit: (values: ExtraWorkFormValues) => void
}

export const ExtraWorkForm = ({ defaultValues, onSubmit }: Props) => {
  const form = useAppForm({
    validationLogic: revalidateLogic(),
    validators: { onDynamic: schema },
    defaultValues: {
      name:           defaultValues?.name ?? '',
      minutesPerUnit: defaultValues ? String(defaultValues.minutesPerUnit) : '',
    },
    onSubmit: ({ value }) => onSubmit({ name: value.name.trim(), minutesPerUnit: Number(value.minutesPerUnit) }),
  })

  return (
    <form
      onSubmit={e => { e.preventDefault(); form.handleSubmit() }}
      className="flex flex-col gap-4 w-full"
    >
      <div className="grid grid-cols-[1fr_140px] gap-3">
        <form.AppField name="name"           children={f => <f.FormTextField label="Назва" placeholder="Пришити бирку" />} />
        <form.AppField name="minutesPerUnit" children={f => <f.FormTextNumberField label="Хв на 1 шт" type="number" />} />
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
