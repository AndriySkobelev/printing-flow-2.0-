import z from 'zod'
import { type FunctionComponent } from "react";
import { useAppForm } from "@/components/main-form";
import { revalidateLogic } from "@tanstack/react-form";
import { api } from "convex/_generated/api";

const fabricUnitsOptions = [
  { value: 'кг', label: 'кг' },
  { value: 'м', label: 'м' },
]

const formSchema = z.object({
  name: z.string().min(1),
  skuPrefix: z.string().min(1),
  units: z.enum(['кг', 'м']),
  processingType: z.string().nullable().optional(),
})

type FormValuesType = z.infer<typeof formSchema>;

interface CreateFabricFormProps {
  formId: string
  isEdit?: boolean
  defaultValues?: Partial<FormValuesType>
  actionSubmit: (values: FormValuesType) => void
}

const CreateFabricForm: FunctionComponent<CreateFabricFormProps> = ({ formId, isEdit, defaultValues, actionSubmit }) => {
  const form = useAppForm({
    validationLogic: revalidateLogic(),
    validators: { onDynamic: formSchema },
    defaultValues:  defaultValues ?? { name: '', skuPrefix: '', units: '', processingType: null },
    onSubmit: ({ value }) => actionSubmit(value as FormValuesType),
  })

  return ( 
    <form
      id={formId}
      onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }}
      className="flex flex-col gap-3"
    >
      <div className="flex gap-2 items-end">
        <form.AppField name="name" children={(f) => <f.FormTextField label="Назва" />} />
        <form.AppField name="processingType" children={(f) => <f.FormTextField label="Обробка" />} />
      </div>
      <div className="flex gap-2 items-end">
        <form.AppField name="skuPrefix" children={(f) => isEdit
          ? <f.FormTextField label="SKU префікс" disabled />
          : (
            <f.FormAsyncTextField
              label="SKU префікс"
              buildArgs={(value) => ({ skuPrefix: value })}
              isTaken={(result) => result?.exists === true}
              query={api.queries.fabrics.checkSkuPrefix}
              takenMessage="Цей SKU префікс вже використовується"
            />
          )
        } />
        <form.AppField name="units" children={(f) => <f.FormSelect options={fabricUnitsOptions} label="Одиниці вим." />} />
      </div>
    </form>
  )
}

export default CreateFabricForm
