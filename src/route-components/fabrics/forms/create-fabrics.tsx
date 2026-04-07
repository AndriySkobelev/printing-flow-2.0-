import z from 'zod'
import { type FunctionComponent } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppForm } from "@/components/main-form";
import { revalidateLogic } from "@tanstack/react-form";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "convex/_generated/api";
import { unitsOptions } from "@/route-components/specifications/forms/create-specefication";

const formSchema = z.object({
  name: z.string(),
  skuPrefix: z.string(),
  units: z.string(),
  colors: z.array(z.object({ value: z.string(), label: z.string() })),
})

type FormValuesType = z.infer<typeof formSchema>;
type valuesSubmitType = {
  colors: Array<string>
}

interface CreateFabricFormProps {
  formId: string,
  defaultValues?: FormValuesType,
  actionSubmit: (values: valuesSubmitType) => void
}
 
const CreateFabricForm: FunctionComponent<CreateFabricFormProps> = ({
  formId,
  defaultValues,
  actionSubmit
}) => {
  const { data } = useQuery(convexQuery(api.queries.specifications.getSpecificationsWithMaterials));
  
  
  const form = useAppForm({
    validationLogic: revalidateLogic(),
    validators: {
      onDynamic: formSchema,
    },
    defaultValues: defaultValues || {
      colors: [],
    },
    onSubmit: ({ value }) => {
      console.log("🚀 ~ CreateProductForm ~ value:", value)
      const clearColors = value.colors.map((color) => color.value);
      actionSubmit({ ...value, colors: clearColors })
    }
  })

  return (
    <>
      <form
        id={formId}
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
        className="flex flex-col gap-3"
      >
        <form.AppField
          name="name"
          children={(field) => <field.FormTextField label="Назва" />}
        />
        <div className="flex flex-row gap-2 items-end">
          <form.AppField
            name="skuPrefix"
            children={(field) => <field.FormTextField label="SKU префікс" />}
          />
           <form.AppField
            name="units"
            children={(field) => <field.FormSelect options={unitsOptions} label="Одиниці вим." />}
          />
        </div>
        <form.AppField
          name='colors'
          children={(field) => <field.FormCreatableSelect isMulti={true} options={[]} label="Кольори" />}
        />
      </form>
    </>
  );
}
 
export default CreateFabricForm;