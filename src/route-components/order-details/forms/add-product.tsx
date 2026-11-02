import z from 'zod'
import { useMemo } from 'react'
import { revalidateLogic, useStore } from '@tanstack/react-form'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { Trash2, Plus } from 'lucide-react'
import { useAppForm } from '@/components/main-form'
import { Button } from '@/components/ui/button'
import Divider from '@/components/ui/divider'
import { productSizes } from '@/constants'
import { api } from 'convex/_generated/api'
import { type Id } from 'convex/_generated/dataModel'

// ─── Schema ───────────────────────────────────────────────────────────────────

const productRowSchema = z.object({
  productId:    z.string(),
  name:         z.string({ error: 'Обовʼязкове поле' }).min(1),
  sku:          z.string().optional(),
  color:        z.string({ error: 'Обовʼязкове поле' }).min(1),
  size:         z.string({ error: 'Обовʼязкове поле' }).min(1),
  quantity:     z.string({ error: 'Обовʼязкове поле' }).min(1),
  shipmentType: z.union([z.literal('manufacturing'), z.literal('warehouse')]),
})

const schema = z.object({
  spec:     z.any(),
  color:    z.any(),
  sizes:    z.any(),
  products: z.array(productRowSchema).min(1, { message: 'Додайте хоча б один товар' }),
})

export type AddProductFormValues = z.infer<typeof schema>
export type ProductRow = z.infer<typeof productRowSchema>

// ─── Options ──────────────────────────────────────────────────────────────────

const shipmentTypeOptions = [
  { value: 'manufacturing', label: 'Виробництво' },
  { value: 'warehouse',     label: 'Склад' },
]

// ─── ProductDataComp ──────────────────────────────────────────────────────────

const ProductDataComp = ({ data }: { data: ProductRow }) => (
  <div className="flex flex-col gap-0.5 min-w-0">
    <div className="text-sm font-medium truncate">{data.name || '—'}</div>
    <div className="flex gap-2 text-xs text-muted-foreground">
      {data.size  && <span>{data.size}</span>}
      {data.color && <span>{data.color}</span>}
    </div>
  </div>
)

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  formId:         string
  onSubmit:       (values: AddProductFormValues) => void
  defaultValues?: Partial<AddProductFormValues>
  isUpdate?:      boolean
}

// ─── helpers ──────────────────────────────────────────────────────────────────

type SpecOption = { value: Id<'specifications'>; label: string }

// Standard size order; sizes not in the list go last, alphabetically.
const sizeRank = (size: string) => {
  const idx = productSizes.indexOf(size)
  return idx === -1 ? productSizes.length : idx
}
const bySize = (a: string, b: string) => sizeRank(a) - sizeRank(b) || a.localeCompare(b)

// ─── AddProductForm ───────────────────────────────────────────────────────────

export const AddProductForm = ({ onSubmit, defaultValues, formId }: Props) => {
  const form = useAppForm({
    validationLogic: revalidateLogic(),
    validators: { onDynamic: schema },
    defaultValues: {
      ...defaultValues,
      spec:     defaultValues?.spec     ?? null,
      color:    defaultValues?.color    ?? null,
      sizes:    defaultValues?.sizes    ?? [],
      products: defaultValues?.products ?? [],
    },
    onSubmit: ({ value }) => onSubmit(value as AddProductFormValues),
  })

  // Product → color → sizes: pick the specification first, then narrow its
  // variants down instead of searching through every variant by text.
  const spec = useStore(form.store, s => s.values.spec) as SpecOption | null
  const color = useStore(form.store, s => s.values.color) as string | null
  const sizeOpts = useStore(form.store, s => s.values.sizes) as Array<{ value: string; label: string }> | null
  const sizes = (sizeOpts ?? []).map(o => o.value)
  const setSizes = (next: string[]) => form.setFieldValue('sizes', next.map(v => ({ value: v, label: v })))

  const { data: specs = [] } = useQuery(convexQuery(api.queries.specifications.getSpecifications, {}))
  const specOptions = useMemo(
    () => specs.map(s => ({ value: s._id, label: s.name })).sort((a, b) => a.label.localeCompare(b.label, 'uk')),
    [specs],
  )

  const { data: variants = [], isLoading: variantsLoading } = useQuery({
    ...convexQuery(api.queries.products.getProductsBySpec, { specificationId: spec?.value as Id<'specifications'> }),
    enabled: !!spec?.value,
  })

  const colorOptions = useMemo(
    () => [...new Set(variants.map(v => v.color).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'uk'))
      .map(c => ({ value: c, label: c })),
    [variants],
  )
  const sizeOptions = useMemo(
    () => [...new Set(variants.filter(v => v.color === color).map(v => v.size).filter(Boolean))]
      .sort(bySize)
      .map(size => ({ value: size, label: size })),
    [variants, color],
  )

  const resetPick = () => { form.setFieldValue('color', null); setSizes([]) }

  const handleAddProduct = () => {
    if (!spec || !color || sizes.length === 0) return
    const existing = form.store.state.values.products
    const rows = [...sizes].sort(bySize)
      .map(size => variants.find(v => v.color === color && v.size === size))
      .filter(v => v && !existing.some(r => r.productId === v._id))
      .map(v => ({
        productId:    v!._id,
        name:         spec.label,
        sku:          v!.sku,
        color:        v!.color,
        size:         v!.size,
        quantity:     '1',
        shipmentType: 'manufacturing' as const,
      }))
    form.setFieldValue('products', [...existing, ...rows])
    setSizes([])
  }

  return (
    <form
      id={formId}
      onSubmit={e => { e.preventDefault(); form.handleSubmit() }}
      className="flex flex-col gap-4 w-full p-3"
    >
      {/* ── Pick: product → color → sizes ─────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.4fr)_auto] gap-2 items-start">
          <form.AppField name="spec"
            children={f => (
              <f.FormSelect
                className="min-w-0"
                label="Виріб"
                valueMode="object"
                placeholder="Виріб..."
                options={specOptions}
                addOnChange={resetPick}
              />
            )}
          />
          <form.AppField name="color"
            children={f => (
              <f.FormSelect
                className="min-w-0"
                label="Колір"
                placeholder="Колір..."
                options={colorOptions}
                disabled={colorOptions.length === 0}
                addOnChange={() => setSizes([])}
              />
            )}
          />
          <form.AppField name="sizes"
            children={f => (
              <f.FormSelect
                isMulti
                singleLine
                className="min-w-0"
                label="Розмір"
                placeholder="Розміри..."
                options={sizeOptions}
                disabled={!color}
              />
            )}
          />
          <Button
            type="button"
            variant="secondary"
            className="mt-6 h-[38px]"
            disabled={!color || sizes.length === 0}
            onClick={handleAddProduct}
          >
            <Plus className="size-4 mr-1" /> Додати
          </Button>
        </div>

        {spec && variantsLoading && <p className="text-xs text-muted-foreground">Завантаження...</p>}
        {spec && !variantsLoading && variants.length === 0 && (
          <p className="text-xs text-muted-foreground">У цього виробу ще немає товарів (кольорів і розмірів).</p>
        )}
      </div>

      <Divider />

      {/* ── Products field array ───────────────────────────────────────── */}
      <form.Field mode="array" name="products">
        {field => (
          <div className="flex flex-col gap-2 max-h-[45vh] overflow-y-auto">
            {field.state.value.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                Немає доданих товарів
              </p>
            )}
            {field.state.value.map((value, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center border rounded-md p-2">
                <ProductDataComp data={value} />
                <form.AppField key={`quantity-${i}`} name={`products[${i}].quantity`}
                  children={f => <f.FormTextNumberField label="Кількість" type="number" />}
                />
                <form.AppField key={`shipmentType-${i}`} name={`products[${i}].shipmentType`}
                  children={f => <f.FormSelect label="Відвантаження" options={shipmentTypeOptions} />}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="self-end"
                  disabled={field.state.value.length === 1}
                  onClick={() => field.removeValue(i)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </form.Field>
    </form>
  )
}

export default AddProductForm
