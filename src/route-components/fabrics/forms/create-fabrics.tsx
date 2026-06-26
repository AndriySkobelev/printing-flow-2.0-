import z from 'zod'
import { type FunctionComponent } from "react";
import { useAppForm } from "@/components/main-form";
import { revalidateLogic } from "@tanstack/react-form";
import { unitsOptions } from "@/route-components/specifications/forms/create-specification";

const formSchema = z.object({
  name: z.string().min(1),
  skuPrefix: z.string().min(1),
  units: z.string().min(1),
  processingType: z.string().nullable().optional(),
})

type FormValuesType = z.infer<typeof formSchema>;

interface CreateFabricFormProps {
  formId: string
  defaultValues?: Partial<FormValuesType>
  actionSubmit: (values: FormValuesType) => void
}

const CreateFabricForm: FunctionComponent<CreateFabricFormProps> = ({ formId, defaultValues, actionSubmit }) => {
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
        <form.AppField name="skuPrefix" children={(f) => <f.FormTextField label="SKU префікс" />} />
        <form.AppField name="units" children={(f) => <f.FormSelect options={unitsOptions} label="Одиниці вим." />} />
      </div>
    </form>
  )
}

export default CreateFabricForm
