import z from 'zod'
import { revalidateLogic } from '@tanstack/react-form'
import { Loader2 } from 'lucide-react'
import { useAppForm } from '@/components/main-form'
import { Button } from '@/components/ui/button'
import { type OrderItem } from '../types'

type Props = {
  item: OrderItem
  onSubmit: (splitQuantity: number) => void
}

export const SplitItemForm = ({ item, onSubmit }: Props) => {
  const schema = z.object({
    splitQuantity: z.number().min(1).max(item.quantity - 1),
  })

  const form = useAppForm({
    validationLogic: revalidateLogic(),
    validators: { onDynamic: schema },
    defaultValues: { splitQuantity: 1 },
    onSubmit: ({ value }) => {
      onSubmit(value.splitQuantity)
    },
  })

  return (
    <form
      onSubmit={e => { e.preventDefault(); form.handleSubmit() }}
      className="flex flex-col gap-4"
    >
      <p className="text-sm text-muted-foreground">
        {item.name} — {item.color} / {item.size}
      </p>

      <form.AppField
        name="splitQuantity"
        children={f => (
          <f.FormInputNumber max={item.quantity - 1} label="Кількість для нового запису" />
        )}
      />

      <form.Subscribe selector={s => [s.values.splitQuantity] as const}>
        {([qty]) => (
          <div className="flex justify-between text-sm rounded-md bg-muted/50 px-3 py-2">
            <span className="text-muted-foreground">
              Новий: <span className="font-medium text-foreground">{qty}</span>
            </span>
            <span className="text-muted-foreground">
              Залишок: <span className="font-medium text-foreground">{item.quantity - qty}</span>
            </span>
          </div>
        )}
      </form.Subscribe>

      <form.Subscribe selector={s => [s.canSubmit, s.isSubmitting] as const}>
        {([canSubmit, isSubmitting]) => (
          <Button type="submit" disabled={!canSubmit || isSubmitting}>
            {isSubmitting
              ? <><Loader2 className="size-4 animate-spin mr-1" />Розділення…</>
              : 'Розділити'
            }
          </Button>
        )}
      </form.Subscribe>
    </form>
  )
}
