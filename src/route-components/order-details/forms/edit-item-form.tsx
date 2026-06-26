import z from 'zod'
import { omit } from 'ramda'
import { revalidateLogic, useStore } from '@tanstack/react-form'
import { Loader2 } from 'lucide-react'
import { useAppForm } from '@/components/main-form'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/check-box'
import { type OrderItem, type BrandingTypeValue } from '../types'
import { BrandingSection } from '../components/branding-section'

const shipmentOptions = [
  { value: 'manufacturing', label: 'Виробництво' },
  { value: 'warehouse',     label: 'Склад'        },
]

const destinationOptions = [
  { value: 'customer',  label: 'Клієнт' },
  { value: 'warehouse', label: 'Склад'  },
  { value: 'defects',   label: 'Брак'   },
]

const editItemFormSchema = z.object({
  quantity:            z.string()
    .transform(val => Number(val))
    .pipe(z.number().min(1, 'Мінімум 1')),
  shipmentType:        z.union([z.literal('manufacturing'), z.literal('warehouse')]),
  brandingComment:     z.string().nullable().optional(),
  sewingComment:       z.string().nullable().optional(),
  brandingType:        z.array(z.any()).nullable().optional(),
  cuttingBrandingType: z.array(z.any()).nullable().optional(),
  destination:         z.union([z.literal('customer'), z.literal('warehouse'), z.literal('defects'), z.literal(null)]).optional(),
  isCustomCut:         z.boolean().nullable().optional(),
  isCustomSewing:      z.boolean().nullable().optional(),
  customCutComment:    z.string().nullable().optional(),
  customSewingComment: z.string().nullable().optional(),
})

export type EditItemFormValues = {
  quantity:            number
  shipmentType:        'manufacturing' | 'warehouse' | null
  brandingComment:     string | null
  sewingComment:       string | null
  brandingType:        BrandingTypeValue[] | null
  cuttingBrandingType: BrandingTypeValue[] | null
  destination:         'customer' | 'warehouse' | 'defects' | null
  isCustomCut:         boolean
  isCustomSewing:      boolean
  customCutComment:    string | undefined
  customSewingComment: string | undefined
}

type Props = {
  item:     OrderItem
  onSubmit: (values: EditItemFormValues) => void
}

const toggle = (current: BrandingTypeValue[], type: BrandingTypeValue): BrandingTypeValue[] =>
  current.includes(type) ? current.filter(t => t !== type) : [...current, type]

export const EditItemForm = ({ item, onSubmit }: Props) => {
  console.log("🚀 ~ EditItemForm ~ item:", item)
  const form = useAppForm({
    validationLogic: revalidateLogic(),
    validators: {
      onDynamic: editItemFormSchema,
    },
    defaultValues: {
      ...omit(['_id', 'name', 'color', 'size'], item),
      quantity: String(item.quantity ?? '1'),
    },
    onSubmit: ({ value }) => {
      console.log('EditItemForm onSubmit', value)
      onSubmit({
        quantity: Number(value.quantity),
        shipmentType:        value.shipmentType as 'manufacturing' | 'warehouse' | null,
        destination:         (value.destination ?? 'customer') as 'customer' | 'warehouse' | 'defects' | null,
        brandingType:        value.brandingType as BrandingTypeValue[],
        cuttingBrandingType: value.cuttingBrandingType as BrandingTypeValue[],
        brandingComment:     value.brandingComment ?? '',
        sewingComment:       value.sewingComment ?? '',
        isCustomCut:         value.isCustomCut ?? false,
        isCustomSewing:      value.isCustomSewing ?? false,
        customCutComment:    value.customCutComment ?? undefined,
        customSewingComment: value.customSewingComment ?? undefined,
      })
    },
  })
    const formState = useStore(form.store, (state: any) => state
    );
    console.log('formState', formState)
  return (
    <form
      onSubmit={e => { e.preventDefault(); form.handleSubmit() }}
      className="flex flex-col gap-4 w-full"
    >
      <div className="flex gap-2 w-fit">
        <div className="flex items-center text-sm text-muted-foreground">
          {item.name}
        </div>
        <div className="flex gap-2">
          <span className="px-2 py-0.5 rounded-full border text-muted-foreground text-xs">{item.size}</span>
          <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs">{item.color}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <form.AppField name="quantity"     children={f => <f.FormTextField label="Кількість" />} />
        <form.AppField name="shipmentType" children={f => <f.FormSelect label="Звідки" options={shipmentOptions} />} />
      </div>

      <form.AppField name="destination" children={f => <f.FormSelect label="Призначення" options={destinationOptions} />} />

      <form.Subscribe selector={s => [s.values.brandingType, s.values.cuttingBrandingType] as const}>
        {([brandingType, cuttingBrandingType]) => (
          <div className="grid grid-cols-2 gap-4">
            <BrandingSection
              label="На готовому"
              active={brandingType ?? []}
              onToggle={type => form.setFieldValue('brandingType', toggle(brandingType ?? [], type))}
            />
            <BrandingSection
              label="На кроях"
              active={cuttingBrandingType ?? []}
              onToggle={type => form.setFieldValue('cuttingBrandingType', toggle(cuttingBrandingType ?? [], type))}
            />
          </div>
        )}
      </form.Subscribe>
      
      <div className='flex gap-2 w-full'>
        <div className="flex flex-col gap-1 w-full">
          <label className="text-sm ml-2 text-[#bbbfc7]">Коментар (брендування)</label>
          <form.AppField name="brandingComment" children={f => <f.TextAreaField placeholder="Коментар…" />} />
        </div>

        <div className="flex flex-col gap-1 w-full">
          <label className="text-sm ml-2 text-[#bbbfc7]">Коментар (пошив)</label>
          <form.AppField name="sewingComment" children={f => <f.TextAreaField placeholder="Коментар…" />} />
        </div>
      </div>

      <form.Subscribe selector={s => [s.values.isCustomCut, s.values.isCustomSewing] as const}>
        {([isCustomCut, isCustomSewing]) => (
          <div className="flex gap-2 justify-between">
            <div className="flex flex-col gap-2 w-full">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <Checkbox
                  checked={!!isCustomCut}
                  onCheckedChange={v => form.setFieldValue('isCustomCut', !!v)}
                />
                <span className="text-sm text-muted-foreground">Індивідуальний крій</span>
              </label>
              {isCustomCut && (
                <form.AppField name="customCutComment" children={f => <f.TextAreaField placeholder="Коментар крою…" />} />
              )}
            </div>
            <div className="flex flex-col gap-2 w-full">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <Checkbox
                  checked={!!isCustomSewing}
                  onCheckedChange={v => form.setFieldValue('isCustomSewing', !!v)}
                />
                <span className="text-sm text-muted-foreground">Індивідуальний пошив</span>
              </label>
              {isCustomSewing && (
                <form.AppField name="customSewingComment" children={f => <f.TextAreaField placeholder="Коментар пошиву…" />} />
              )}
            </div>
          </div>
        )}
      </form.Subscribe>

      <form.Subscribe selector={s => [s.canSubmit, s.isSubmitting] as const}>
        {([canSubmit, isSubmitting]) => (
          <Button type="submit" disabled={!canSubmit || isSubmitting}>
            {isSubmitting
              ? <><Loader2 className="size-4 animate-spin mr-1" />Збереження…</>
              : 'Зберегти'
            }
          </Button>
        )}
      </form.Subscribe>
    </form>
  )
}
