import z from 'zod'
import { revalidateLogic } from '@tanstack/react-form'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { Loader2, RotateCcw, Trash2Icon } from 'lucide-react'
import { api } from 'convex/_generated/api'
import { type Id } from 'convex/_generated/dataModel'
import { useAppForm } from '@/components/main-form'
import { Button } from '@/components/ui/button'
import { useAsyncOptions } from '@/route-components/specifications/utils/hooks'
import { type OrderItem } from '../types'

const itemSpecFormSchema = z.object({
  lines: z.array(z.object({
    lineId:   z.string().optional(),
    name:     z.string(),
    type:     z.union([z.literal('fabric'), z.literal('material')]),
    id:       z.object({ value: z.string(), label: z.string() }, { message: 'Оберіть варіант' }),
    quantity: z.string().min(1, 'Вкажіть кількість'),
  })),
})

type ItemSpecFormValues = z.infer<typeof itemSpecFormSchema>
type ItemSpecLine = ItemSpecFormValues['lines'][number]

export type ItemSpecSubmitValues = Array<{
  lineId?:  string
  name?:    string
  type:     'fabric' | 'material'
  id:       Id<'fabricVariants'> | Id<'materialVariants'>
  quantity: number
}>

type Props = {
  item:     OrderItem
  formId:   string
  onSubmit: (materials: ItemSpecSubmitValues) => void
  onReset:  () => void
}

const newLine = (type: 'fabric' | 'material') =>
  ({ lineId: undefined, name: '', type, id: undefined, quantity: '' }) as unknown as ItemSpecLine

type FormProps = Omit<Props, 'item'> & {
  item:         OrderItem
  isCustom:     boolean
  defaultLines: Array<ItemSpecLine>
}

const ItemSpecLinesForm = ({ item, formId, isCustom, defaultLines, onSubmit, onReset }: FormProps) => {
  const { loadOptions: fabricOptions }   = useAsyncOptions(api.queries.fabrics.getFabricVariantOptions, 'fabricVariants')
  const { loadOptions: materialOptions } = useAsyncOptions(api.queries.materials.getMaterialVariantOptions, 'materialsVariants')

  const form = useAppForm({
    validationLogic: revalidateLogic(),
    validators: { onDynamic: itemSpecFormSchema },
    defaultValues: { lines: defaultLines },
    onSubmit: ({ value }) => {
      onSubmit(value.lines.map(line => ({
        lineId:   line.lineId,
        name:     line.name,
        type:     line.type,
        id:       line.id.value as Id<'fabricVariants'> | Id<'materialVariants'>,
        quantity: Number(line.quantity),
      })))
    },
  })

  return (
    <form
      id={formId}
      onSubmit={e => { e.preventDefault(); form.handleSubmit() }}
      className="flex flex-col gap-3 w-full"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2 items-center">
          <span className="text-sm text-muted-foreground">{item.name}</span>
          <span className="px-2 py-0.5 rounded-full border text-muted-foreground text-xs">{item.size}</span>
          <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs">{item.color}</span>
          {isCustom && (
            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs">Змінена</span>
          )}
        </div>
        {isCustom && (
          <Button type="button" variant="outline" size="sm" onClick={onReset}>
            <RotateCcw className="size-3 mr-1" />Скинути до базової
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Кількість — на одну одиницю товару. Додавання чи видалення рядків робить товар індивідуальним кроєм і пошивом, заміна матеріалу — індивідуальним кроєм.
      </p>

      <form.Field mode="array" name="lines">
        {(field) => (
          <div className="flex flex-col gap-2 w-full">
            {field.state.value.map((line, i) => (
              <div key={line.lineId ?? `new-${i}`} className="flex gap-2 w-full items-end">
                <form.AppField name={`lines[${i}].name`}
                  children={f => <f.FormTextField className="flex-3" type="text" label="Назва" />}
                />
                <form.AppField name={`lines[${i}].id`}
                  children={f => (
                    <f.FormAsyncSelect
                      className="flex-6"
                      valueMode="object"
                      label={line.type === 'material' ? 'Матеріал' : 'Тканина'}
                      modeOption={line.type === 'fabric' ? 'fabric' : 'materials'}
                      asyncOptions={line.type === 'material' ? materialOptions : fabricOptions}
                      defaultOptions={line.id ? [line.id] : []}
                    />
                  )}
                />
                <form.AppField name={`lines[${i}].quantity`}
                  children={f => <f.FormTextNumberField className="flex-2" type="number" label="Кількість" />}
                />
                <Button type="button" className="self-end" onClick={() => field.removeValue(i)}>
                  <Trash2Icon size={17} />
                </Button>
              </div>
            ))}
            <div className="flex gap-2 mt-2">
              <Button className="flex-1 text-primary/80" type="button" variant="secondary" onClick={() => field.pushValue(newLine('material'))}>Додати матеріал</Button>
              <Button className="flex-1 text-primary/80" type="button" variant="secondary" onClick={() => field.pushValue(newLine('fabric'))}>Додати тканину</Button>
            </div>
          </div>
        )}
      </form.Field>
    </form>
  )
}

export const ItemSpecForm = ({ item, formId, onSubmit, onReset }: Props) => {
  const { data, isLoading } = useQuery(convexQuery(api.queries.orderItemSpec.getOrderItemSpecMaterials, {
    itemId: item._id as Id<'productionOrderItems'>,
  }))

  if (isLoading) return <div className="flex justify-center p-6"><Loader2 className="size-5 animate-spin" /></div>
  if (!data) return <p className="text-sm text-muted-foreground">Специфікацію товару не знайдено.</p>

  const defaultLines: Array<ItemSpecLine> = data.lines.map(line => ({
    lineId:   line.lineId,
    name:     line.name ?? '',
    type:     line.type,
    id:       (line.id && line.label ? { value: line.id, label: line.label } : undefined) as ItemSpecLine['id'],
    quantity: String(line.quantity),
  }))

  return (
    <ItemSpecLinesForm
      item={item}
      formId={formId}
      isCustom={data.isCustom}
      defaultLines={defaultLines}
      onSubmit={onSubmit}
      onReset={onReset}
    />
  )
}
