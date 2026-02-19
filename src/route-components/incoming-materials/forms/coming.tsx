import { type FunctionComponent } from "react";
import { type Option } from '@/components/main-form/form-select' 
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from "convex/_generated/api";
import { z } from 'zod';
import { useAppForm } from "@/components/main-form";
import { revalidateLogic } from '@tanstack/react-form';

const comingFormSchema = z.object({
  materialId: z.object({ value: z.string(), label: z.string() }),
  quantity: z.number().min(0.1, { message: 'Quantity must be at least 0.1' }),
});

export type IncomingFormData = z.infer<typeof comingFormSchema>;

const makeFabricOptions =<T,> (data: Array<T & { color: string, fabricName: string, sku: string, _id: string}>): Array<Option> => {
  const operationData = data || [];
  return operationData.map((item) => ({
    value: item._id,
    label: `${item.fabricName} · ${item.color} · ${item.sku}` as string,
  }))
}

interface ComingMaterialFormProps {
  type: 'incoming' | 'outgoing';
  actionSubmit: (data: FormData) => void;
  defaultValue?: IncomingFormData;
  formId: 'incoming-material-form' | 'outgoing-material-form'
}
 
const ComingMaterialForm: FunctionComponent<ComingMaterialFormProps> = ({
  formId,
  type,
  actionSubmit,
  defaultValue,
}) => {
  const { data: fabricsData } = useQuery(convexQuery(api.fabrics.getFabrics));

  const form = useAppForm({
    validationLogic: revalidateLogic(),
    validators: {
      onDynamic: comingFormSchema,
    },
    defaultValues: defaultValue || { materialId: {} } as IncomingFormData,
    onSubmit: ({ value }: any) => {
      const findFabric = fabricsData?.find((fabric) => fabric._id === value.materialId.value);
      const submitData = {
        ...value,
        type,
        sku: findFabric?.sku,
        color: findFabric?.color,
        units: findFabric?.units,
        name: findFabric?.fabricName,
      }
      return actionSubmit(submitData);
    },
  });

  const someData = fabricsData || [];
  const fabricsOptions = makeFabricOptions(someData);
  

  return (
    <div>
      <form
        id={formId}
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
        className="flex flex-col gap-3"
      >
        <form.AppField
          name="materialId"
          children={(field) =>
            <field.FormSelect label="Матеріал" modeOption="fabric" options={fabricsOptions} />
          }
        />
        <form.AppField
          name="quantity"
          children={(field) =>
            <field.FormTextField
              type="number"
              label='Кількість'
              placeholder={''} />
          }
        />
      </form>
    </div>
  );
}
 
export default ComingMaterialForm;