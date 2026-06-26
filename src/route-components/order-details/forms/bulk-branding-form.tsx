import { useAppForm } from '@/components/main-form'
import { revalidateLogic } from '@tanstack/react-form'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { BrandingSection } from '../components/branding-section'
import { type BrandingTypeValue } from '../types'

type FormValues = {
  brandingType:        BrandingTypeValue[]
  cuttingBrandingType: BrandingTypeValue[]
  brandingComment:     string
  sewingComment:       string
}

type Props = {
  onSubmit:      (values: FormValues) => void
  defaultValues?: Partial<FormValues>
}

export const BulkBrandingForm = ({ onSubmit, defaultValues }: Props) => {
  const form = useAppForm({
    validationLogic: revalidateLogic(),
    defaultValues: {
      brandingType:        defaultValues?.brandingType        ?? [] as BrandingTypeValue[],
      cuttingBrandingType: defaultValues?.cuttingBrandingType ?? [] as BrandingTypeValue[],
      brandingComment:     defaultValues?.brandingComment     ?? '',
      sewingComment:       defaultValues?.sewingComment       ?? '',
    },
    onSubmit: ({ value }) => {
      onSubmit(value)
      form.reset()
    },
  })

  const toggle = (current: BrandingTypeValue[], type: BrandingTypeValue): BrandingTypeValue[] =>
    current.includes(type) ? current.filter(t => t !== type) : [...current, type]

  return (
    <form
      onSubmit={e => { e.preventDefault(); form.handleSubmit() }}
      className="flex flex-col gap-4 w-full"
    >
      <form.Subscribe selector={s => [s.values.brandingType, s.values.cuttingBrandingType] as const}>
        {([brandingType, cuttingBrandingType]) => (
          <div className="grid grid-cols-2 gap-4">
            <BrandingSection
              label="На готовому"
              active={brandingType}
              onToggle={type => form.setFieldValue('brandingType', toggle(brandingType, type))}
            />
            <BrandingSection
              label="На кроях"
              active={cuttingBrandingType}
              onToggle={type => form.setFieldValue('cuttingBrandingType', toggle(cuttingBrandingType, type))}
            />
          </div>
        )}
      </form.Subscribe>

      <form.AppField
        name="brandingComment"
        children={field => (
          <field.TextAreaField placeholder="Коментар до брендування…" />
        )}
      />

      <form.AppField
        name="sewingComment"
        children={field => (
          <field.TextAreaField placeholder="Коментар до пошиву…" />
        )}
      />

      <form.Subscribe selector={s => [s.canSubmit, s.isSubmitting] as const}>
        {([canSubmit, isSubmitting]) => (
          <Button type="submit" size="sm" disabled={!canSubmit || isSubmitting} className="w-full">
            {isSubmitting
              ? <><Loader2 className="size-4 animate-spin" /> Збереження…</>
              : 'Застосувати до всіх'
            }
          </Button>
        )}
      </form.Subscribe>
    </form>
  )
}
