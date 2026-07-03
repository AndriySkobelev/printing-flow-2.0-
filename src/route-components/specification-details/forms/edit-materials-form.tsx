import z from 'zod'
import { type FunctionComponent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from 'convex/_generated/api'
import { ArrowLeftRight } from 'lucide-react'
import { type Id } from 'convex/_generated/dataModel'
import { useAppForm } from '@/components/main-form'

type SpecLine = {
  lineId: string
  name: string
  units: string
  quantity: string | number
  fabricId?: Id<'fabrics'>
  materialId?: Id<'materials'>
}

const FabricLineField = ({ fabricId, index, form }: { fabricId: Id<'fabrics'>; index: number; form: any }) => {
  const { data } = useQuery(convexQuery(api.queries.fabrics.getFabricById, { id: fabricId }))
  const options = (data?.variants ?? [])
    .sort((a: any, b: any) => a.skuNumber - b.skuNumber)
    .map((v: any) => ({ value: v._id, label: v.color }))

  return (
    <form.AppField
      name={`lines[${index}].variantId`}
      children={(field: any) => <field.FormSelect options={options} />}
    />
  )
}

const MaterialLineField = ({ materialId, index, form }: { materialId: Id<'materials'>; index: number; form: any }) => {
  const { data } = useQuery(convexQuery(api.queries.materials.getMaterialWithVariants, { id: materialId }))
  const options = (data?.variants ?? [])
    .sort((a: any, b: any) => a.skuNumber - b.skuNumber)
    .map((v: any) => ({ value: v._id, label: [v.color, v.size].filter(Boolean).join(' ') }))

  return (
    <form.AppField
      name={`lines[${index}].variantId`}
      children={(field: any) => <field.FormSelect options={options} />}
    />
  )
}

const formSchema = z.object({
  lines: z.array(z.object({
    lineId: z.string(),
    variantId: z.string(),
  })),
})

export type EditMaterialsFormType = {
  updates: Array<{
    lineId: string
    fabricVariantId?: Id<'fabricVariants'>
    materialVariantId?: Id<'materialVariants'>
  }>
}

interface InnerProps {
  formId: string
  specLines: SpecLine[]
  actionSubmit: (values: EditMaterialsFormType) => void
}

const EditMaterialsFormInner: FunctionComponent<InnerProps> = ({ formId, specLines, actionSubmit }) => {
  const form = useAppForm({
    validators: { onDynamic: formSchema },
    defaultValues: {
      lines: specLines.map(m => ({ lineId: m.lineId, variantId: '' })),
    },
    onSubmit: ({ value }) => {
      const updates = value.lines
        .filter(l => !!l.variantId)
        .map((l) => {
          const specLine = specLines.find(s => s.lineId === l.lineId)
          return {
            lineId: l.lineId,
            ...(specLine?.fabricId
              ? { fabricVariantId: l.variantId as Id<'fabricVariants'> }
              : { materialVariantId: l.variantId as Id<'materialVariants'> }),
          }
        })
      actionSubmit({ updates })
    },
  })

  return (
    <form
      id={formId}
      onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }}
      className="flex flex-col"
    >
      <form.Field mode="array" name="lines">
        {(field) => (
          <div className="flex flex-col gap-3">
            {field.state.value?.map((_, i) => {
              const specMat = specLines[i]
              return (
                <div key={specMat.lineId} className="flex items-center gap-4">
                  <div className="flex flex-col min-w-40">
                    <span className="text-sm truncate">{specMat.name}</span>
                    <span className="text-xs text-muted-foreground">{specMat.quantity} {specMat.units}</span>
                  </div>
                  <ArrowLeftRight size={15} className='stroke-1' />
                  <div className="flex-1">
                    {specMat.fabricId
                      ? <FabricLineField fabricId={specMat.fabricId} index={i} form={form} />
                      : specMat.materialId
                        ? <MaterialLineField materialId={specMat.materialId} index={i} form={form} />
                        : null
                    }
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </form.Field>
    </form>
  )
}

interface Props {
  formId: string
  specificationId: Id<'specifications'>
  actionSubmit: (values: EditMaterialsFormType) => void
}

const EditMaterialsForm: FunctionComponent<Props> = ({ formId, specificationId, actionSubmit }) => {
  const { data: specLines, isLoading } = useQuery(
    convexQuery(api.queries.products.getSpecMaterialLines, { specificationId })
  )

  if (isLoading || !specLines) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="size-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <EditMaterialsFormInner
      formId={formId}
      specLines={specLines as unknown as SpecLine[]}
      actionSubmit={actionSubmit}
    />
  )
}

export default EditMaterialsForm
