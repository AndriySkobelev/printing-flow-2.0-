import z from 'zod'
import { type FunctionComponent } from "react";
import { useAppForm } from "@/components/main-form";
import { revalidateLogic } from "@tanstack/react-form";

const formSchema = z.object({
  colors: z.array(z.object({ value: z.string(), label: z.string() })).min(1),
  threds: z.string().nullable(),
})

type FormValuesType = z.infer<typeof formSchema>;

interface AddFabricVariantFormProps {
  formId: string
  actionSubmit: (values: { colors: string[]; threds: string | null }) => void
}

const AddFabricVariantForm: FunctionComponent<AddFabricVariantFormProps> = ({ formId, actionSubmit }) => {
  const form = useAppForm({
    validationLogic: revalidateLogic(),
    validators: { onDynamic: formSchema },
    defaultValues: { colors: [] as { value: string; label: string }[], threds: null as string | null },
    onSubmit: ({ value }) => {
      actionSubmit({
        colors: (value as FormValuesType).colors.map(c => c.value),
        threds: value.threds ?? null,
      })
    },
  })

  return (
    <form
      id={formId}
      onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }}
      className="flex flex-col gap-3"
    >
      <form.AppField
        name="colors"
        children={(f) => <f.FormCreatableSelect isMulti label="Кольори" options={[]} />}
      />
      <form.AppField name="threds" children={(f) => <f.FormTextField label="Номер нитки" />} />
    </form>
  )
}

export default AddFabricVariantForm
