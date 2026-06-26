import z from 'zod'
import { revalidateLogic } from '@tanstack/react-form'
import { Trash2, Plus } from 'lucide-react'
import { useAppForm } from '@/components/main-form'
import { Button } from '@/components/ui/button'
import { useAsyncOptions } from '@/hooks'
import { api } from 'convex/_generated/api'

// ─── Schema ───────────────────────────────────────────────────────────────────

const productRowSchema = z.object({
  name:         z.string({ error: 'Обовʼязкове поле' }).min(1),
  sku:          z.string().optional(),
  color:        z.string({ error: 'Обовʼязкове поле' }).min(1),
  size:         z.string({ error: 'Обовʼязкове поле' }).min(1),
  quantity:     z.string({ error: 'Обовʼязкове поле' }).min(1),
  shipmentType: z.union([z.literal('manufacturing'), z.literal('warehouse')]),
})

const schema = z.object({
  product:  z.any(),
  products: z.array(productRowSchema).min(1, { message: 'Додайте хоча б один товар' }),
})

export type AddProductFormValues = z.infer<typeof schema>
export type ProductRow = z.infer<typeof productRowSchema>

// ─── Options ──────────────────────────────────────────────────────────────────

const shipmentTypeOptions = [
  { value: 'manufacturing', label: 'Виробництво' },
  { value: 'warehouse',     label: 'Склад' },
]

const defaultProductRow: ProductRow = {
  name:         '',
  color:        '',
  size:         '',
  quantity:     '',
  shipmentType: 'manufacturing',
}

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

const regex4 = /^([^·]+) · ([^·]+) · ([^·]+) · ([^·]+)$/

type ProductOption = { value: string; label: string; price?: number }

const parseProductOption = (opt: ProductOption): Omit<ProductRow, 'quantity' | 'shipmentType'> => {
  const match = (opt.label ?? '').match(regex4)
  const [, name = '', size = '', color = '', sku = ''] = match ?? []
  return { name: name.trim(), size: size.trim(), color: color.trim(), sku: sku.trim() || undefined }
}

// ─── AddProductForm ───────────────────────────────────────────────────────────

export const AddProductForm = ({ onSubmit, defaultValues, formId, isUpdate = false }: Props) => {
  const { loadOptions: loadProductOptions } = useAsyncOptions(api.queries.products.getSearchProducts, 'products')

  const form = useAppForm({
    validationLogic: revalidateLogic(),
    validators: { onDynamic: schema },
    defaultValues: {
      ...defaultValues,
      product:  defaultValues?.product  ?? null,
      products: defaultValues?.products ?? [],
    },
    onSubmit: ({ value }) => onSubmit(value as AddProductFormValues),
  })

  const handleAddProduct = () => {
    const product = form.store.state.values.product as ProductOption | undefined
    if (!product?.value) return
    const { name, size, color, sku } = parseProductOption(product)
    form.setFieldValue('products', [
      ...form.store.state.values.products,
      { name, color, size, sku, quantity: '1', shipmentType: 'manufacturing' },
    ])
    form.setFieldValue('product', null)
  }

  return (
    <form
      id={formId}
      onSubmit={e => { e.preventDefault(); form.handleSubmit() }}
      className="flex flex-col gap-4 w-full p-3"
    >
      {/* ── Product search (outside fieldArray) ───────────────────────── */}
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <form.AppField name="product"
            children={f => (
              <f.FormAsyncSelect
                label="Додати товар"
                modeOption="product"
                valueMode="object"
                asyncOptions={loadProductOptions}
              />
            )}
          />
        </div>
        <form.Subscribe selector={s => !!s.values.product}>
          {hasProduct => (
            <Button
              type="button"
              variant="secondary"
              disabled={!hasProduct}
              onClick={handleAddProduct}
            >
              <Plus className="size-4 mr-1" /> Додати
            </Button>
          )}
        </form.Subscribe>
      </div>

      {/* ── Products field array ───────────────────────────────────────── */}
      <form.Field mode="array" name="products">
        {field => (
          <div className="flex flex-col gap-2">
            {field.state.value.map((value, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center border rounded-md p-2">
                <ProductDataComp data={value} />
                <form.AppField key={`quantity-${i}`} name={`products[${i}].quantity`}
                  children={f => <f.FormTextField label="Кількість" type="number" />}
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
