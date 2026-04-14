import { type FunctionComponent } from "react";
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from "convex/_generated/api";
import { z } from 'zod';
import { makeFabricOptions, makeMaterialsOptions } from "@/components/main-form/select/options";
import { revalidateLogic } from '@tanstack/react-form';

import { useAppForm } from "@/components/main-form";

const comingFormSchema = z.object({
  materialId: z.object({ value: z.string(), label: z.string() }),
  materialType: z.enum(['fabric', 'materials']),
  quantity: z.string().min(0.1, { message: 'Quantity must be at least 0.1' }),
});

export type IncomingFormData = z.infer<typeof comingFormSchema>;

interface ComingMaterialFormProps {
  type: 'incoming' | 'outgoing';
  actionSubmit: (data: FormData) => void;
  defaultValue?: IncomingFormData;
  formId: 'incoming-material-form' | 'outgoing-material-form'
}
 
const materialTypeOptions = [
  { value: 'fabric', label: 'Тканина' },
  { value: 'materials', label: 'Матеріали' },
];

const ComingMaterialForm: FunctionComponent<ComingMaterialFormProps> = ({
  formId,
  type,
  actionSubmit,
  defaultValue,
}) => {
  const { data: fabricsData } = useQuery(convexQuery(api.queries.fabrics.getFabrics));
  const { data: materialsData } = useQuery(convexQuery(api.queries.materials.getMaterials));

  const form = useAppForm({
    validationLogic: revalidateLogic(),
    validators: {
      onDynamic: comingFormSchema,
    },
    defaultValues: defaultValue || { materialId: {}, materialType: 'fabric' } as IncomingFormData,
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

  const fabricsOptions = makeFabricOptions(fabricsData || []);
  const materialsOptions = makeMaterialsOptions(materialsData || []);
  
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
        <div className="flex gap-2">
          <form.Subscribe
            selector={(state) => state.values.materialType}
            children={(materialType) => (
              <form.AppField
                name="materialId"
                children={(field) =>
                  <field.FormSelect
                    label="Матеріал"
                    valueMode='object'
                    modeOption={materialType === 'materials' ? 'materials' : 'fabric'}
                    options={materialType === 'materials' ? materialsOptions : fabricsOptions}
                  />
                }
              />
            )}
          />
          <form.AppField
            name="materialType"
            children={(field) =>
              <field.FormSelect label="Тип матеріалу" options={materialTypeOptions} />
            }
          />
        </div>
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