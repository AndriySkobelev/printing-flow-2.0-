import { type FunctionComponent } from "react";
import { useStore } from "@tanstack/react-form";
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from "convex/_generated/api";
import { z } from 'zod';
import { useAppForm } from "@/components/form";
import Select from 'react-select'
import { type MaterialsOption } from "../index";
import { revalidateLogic } from '@tanstack/react-form';

const comingFormSchema = z.object({
  fabricName: z.string(),
  color: z.string(),
  quantity: z.number().min(0.1, { message: 'Quantity must be at least 0.1' }),
});

export type IncomingFormData = z.infer<typeof comingFormSchema>;

const valueToOption = (value: string | number | null) => ({
  value,
  label: value,
});

interface ComingMaterialFormProps {
  actionSubmit: (data: FormData) => void;
  defaultValue?: IncomingFormData;
  formId: 'coming-material-form' | 'consumption-material-form'
}
 
const ComingMaterialForm: FunctionComponent<ComingMaterialFormProps> = ({
  formId,
  actionSubmit,
  defaultValue,
}) => {
  const form = useAppForm({
    validationLogic: revalidateLogic(),
    validators: {
      onDynamic: comingFormSchema,
    },
    defaultValues: defaultValue || {} as IncomingFormData,
    onSubmit: ({ value }: any) => actionSubmit(value),
  });
  const fabricName = useStore(form.store, (formState) => {
    return formState.values ? formState.values?.fabricName : '';
  }) as string;
  console.log("🚀 ~ ComingMaterialForm ~ fabricName:", fabricName)
  const { data: materialsBy } = useQuery(convexQuery(api.materials.getMaterialsByFilter, { fabricName }));
  console.log("🚀 ~ ComingMaterialForm ~ materialsBy:", materialsBy)
  

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
        <form.Field
          name="fabricName"
          children={(field) =>
            <div className="flex flex-col gap-1">
              <label className="text-sm ml-2 text-[#6a7282]">Назва матеріалу</label>
              <Select
                name={field.name}
                options={[{
                  value: 'Кулір 190',
                  label: 'Кулір 190',
                }]}
                placeholder="Виберіть матеріал..."
                value={
                  typeof field.state.value === 'string'
                  ? valueToOption(field.state.value)
                  : field.state.value
                }
                onChange={field.handleChange}
                styles={{
                  control: (baseStyles, state) => ({
                    ...baseStyles,
                    borderRadius: '8px',
                    borderColor: state.isFocused ? 'grey' : '#e7e3e4',
                  }),
                }}/>
                <span>{field.state.meta.errors[0]?.message}</span>
            </div>
          }
        />
        <form.Field
          name="color"
          children={(field) =>
            <div className="flex flex-col gap-1">
              <label className="text-sm ml-2 text-[#6a7282]">Колір</label>
              <Select
                name={field.name}
                placeholder="Виберіть матеріал..."
                // options={colorOptions}
                value={
                  typeof field.state.value === 'string'
                  ? valueToOption(field.state.value)
                  : field.state.value
                }
                onChange={field.handleChange}
                styles={{
                  control: (baseStyles, state) => ({
                    ...baseStyles,
                    borderRadius: '8px',
                    borderColor: state.isFocused ? 'grey' : '#e7e3e4',
                  }),
                }} />
                <span>{field.state.meta.errors[0]?.message}</span>
            </div>
          }
        />
        <form.AppField
          name="quantity"
          children={(field) =>
            <field.FormTextField
              type="number"
              label={'Кількість'}
              placeholder={''} />
          }
        />
      </form>
    </div>
  );
}
 
export default ComingMaterialForm;