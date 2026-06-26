import z from 'zod'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useMutation } from 'convex/react'
import { revalidateLogic } from '@tanstack/react-form'
import { api } from 'convex/_generated/api'
import { type Id } from 'convex/_generated/dataModel'
import { useAppForm } from '@/components/main-form'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

// ─── Config ──────────────────────────────────────────────────────────────────

const LOG_TYPES = [
  { value: 'completed',     label: 'Виконано',      color: '#22c55e' },
  { value: 'defect_fabric', label: 'Брак тканини',  color: '#f59e0b' },
  { value: 'defect_print',  label: 'Брак друку',    color: '#ef4444' },
] as const

type LogType = typeof LOG_TYPES[number]['value']

const QUICK_NOTES: Record<LogType, string[]> = {
  completed:     [],
  defect_fabric: ['Пляма', 'Дірка', 'Затяжка', 'Розрив'],
  defect_print:  ['Зміщення', 'Розмазано', 'Нечіткий контур', 'Колір не збігається'],
}

// ─── Schema ──────────────────────────────────────────────────────────────────

const makeSchema = (maxQuantity: number) =>
  z.object({
    type:     z.string().min(1, 'Оберіть тип'),
    quantity: z.number().int().min(1, 'Мінімум 1').max(maxQuantity, `Максимум ${maxQuantity}`),
    comment:  z.string(),
  })

// ─── Props ───────────────────────────────────────────────────────────────────

type Props = {
  brandingTaskId: string
  productionOrderItemId: string
  maxQuantity: number
  onDone?: () => void
}

// ─── Component ───────────────────────────────────────────────────────────────

export const BrandingLogForm = ({ brandingTaskId, productionOrderItemId, maxQuantity, onDone }: Props) => {
  const createLog = useMutation(api.queries.branding.createBrandingLog)
  const [activeType, setActiveType] = useState<LogType>('completed')

  const form = useAppForm({
    validationLogic: revalidateLogic(),
    validators: { onDynamic: makeSchema(maxQuantity) },
    defaultValues: {
      type:     'completed',
      quantity: 1,
      comment:  '',
    },
    onSubmit: async ({ value }) => {
      await createLog({
        brandingTaskId:        brandingTaskId as Id<'brandingTasks'>,
        productionOrderItemId: productionOrderItemId as Id<'productionOrderItems'>,
        type:     value.type as LogType,
        quantity: value.quantity,
        comment:  value.comment.trim() || undefined,
      })
      form.reset()
      onDone?.()
    },
  })

  const handleTypeChange = (type: LogType) => {
    setActiveType(type)
    form.setFieldValue('type', type)
    form.setFieldValue('comment', '')
  }

  const activeConfig = LOG_TYPES.find(t => t.value === activeType)!
  const quickNotes   = QUICK_NOTES[activeType]

  return (
    <form
      onSubmit={e => { e.preventDefault(); form.handleSubmit() }}
      className="flex flex-col gap-3 w-full"
    >
      {/* Type tabs */}
      <Tabs value={activeType} onValueChange={v => handleTypeChange(v as LogType)}>
        <TabsList className="w-full">
          {LOG_TYPES.map(t => (
            <TabsTrigger
              key={t.value}
              value={t.value}
              className="flex-1 text-xs data-[state=active]:text-white transition-colors"
              style={activeType === t.value ? { backgroundColor: t.color, borderColor: t.color } : undefined}
            >
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Quantity */}
      <form.AppField
        name="quantity"
        children={field => (
          <field.FormInputNumber label="Кількість" max={maxQuantity} />
        )}
      />

      {/* Quick-note chips */}
      {quickNotes.length > 0 && (
        <form.Subscribe selector={state => state.values.comment}>
          {comment => (
            <div className="flex flex-wrap gap-1">
              {quickNotes.map(note => (
                <button
                  key={note}
                  type="button"
                  onClick={() => form.setFieldValue('comment', comment === note ? '' : note)}
                  className="px-2 py-0.5 rounded-full text-xs border transition-colors"
                  style={
                    comment === note
                      ? { backgroundColor: activeConfig.color, borderColor: activeConfig.color, color: '#fff' }
                      : undefined
                  }
                >
                  {note}
                </button>
              ))}
            </div>
          )}
        </form.Subscribe>
      )}

      {/* Comment */}
      <form.AppField
        name="comment"
        children={field => (
          <field.TextAreaField placeholder="Коментар (необов'язково)" />
        )}
      />

      {/* Submit */}
      <form.Subscribe selector={state => [state.canSubmit, state.isSubmitting] as const}>
        {([canSubmit, isSubmitting]) => (
          <Button
            type="submit"
            size="sm"
            disabled={!canSubmit || isSubmitting}
            className="w-full text-white transition-colors"
            style={{ backgroundColor: activeConfig.color, borderColor: activeConfig.color }}
          >
            {isSubmitting
              ? <><Loader2 className="size-4 animate-spin" /> Збереження…</>
              : 'Зберегти'
            }
          </Button>
        )}
      </form.Subscribe>
    </form>
  )
}

export default BrandingLogForm
