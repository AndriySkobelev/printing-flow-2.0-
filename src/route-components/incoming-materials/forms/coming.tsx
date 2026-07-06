import { z } from 'zod';
import { api } from "convex/_generated/api";
import { type FunctionComponent } from "react";
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { makeOptions } from "@/components/main-form/select/options";
import { revalidateLogic } from '@tanstack/react-form';
import { useAppForm } from "@/components/main-form";

const comingFormSchema = z.object({
  parentId: z.object({ value: z.string(), label: z.string() }),
  variantId: z.object({ value: z.string(), label: z.string() }).optional(),
  materialType: z.enum(['fabrics', 'materials']),
  quantity: z.string().min(0.1, { message: 'Quantity must be at least 0.1' }),
});

export type IncomingFormData = z.infer<typeof comingFormSchema>;

interface ComingMaterialFormProps {
  type: 'incoming' | 'outgoing';
  defaultValue?: IncomingFormData;
  actionSubmit: (data: FormData) => void;
  formId: 'incoming-material-form' | 'outgoing-material-form'
}

const materialTypeOptions = [
  { value: 'fabrics', label: 'Тканина' },
  { value: 'materials', label: 'Матеріали' },
];

// Once a parent fabric/material is picked, this resolves its variants (color/size)
// so the movement can be recorded against the specific variant the schema requires.
const VariantField = ({ parentId, materialType, form }: { parentId: string; materialType: 'fabrics' | 'materials'; form: any }) => {
  const fabricQuery = useQuery({
    ...convexQuery(api.queries.fabrics.getFabricById, { id: parentId as any }),
    enabled: materialType === 'fabrics',
  });
  const materialQuery = useQuery({
    ...convexQuery(api.queries.materials.getMaterialWithVariants, { id: parentId as any }),
    enabled: materialType === 'materials',
  });

  const variants = (materialType === 'fabrics' ? fabricQuery.data?.variants : materialQuery.data?.variants) ?? [];
  const options = [...variants]
    .sort((a: any, b: any) => a.skuNumber - b.skuNumber)
    .map((v: any) => ({
      value: v._id,
      label: materialType === 'fabrics' ? v.color : [v.color, v.size].filter(Boolean).join(' '),
    }));

  return (
    <form.AppField
      name="variantId"
      children={(field: any) => (
        <field.FormSelect label="Варіант" valueMode="object" options={options} />
      )}
    />
  );
};

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
    defaultValues: defaultValue || { parentId: undefined, variantId: undefined, materialType: 'fabrics' } as unknown as IncomingFormData,
    onSubmit: ({ value }: any) => {
      const submitData = {
        materialType: value.materialType === 'materials' ? 'materialVariants' : 'fabricVariants',
        materialId: value.variantId?.value,
        quantity: Number(value.quantity),
        type,
      }

      return actionSubmit(submitData as any);
    },
  });

  const fabricsOptions = makeOptions(fabricsData || [], 'name', '_id');
  const materialsOptions = makeOptions(materialsData || [], 'name', '_id');

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
          name="materialType"
          children={(field) =>
            <field.FormSelect
              label="Тип матеріалу"
              options={materialTypeOptions}
              addOnChange={() => {
                form.setFieldValue('parentId', undefined as any);
                form.setFieldValue('variantId', undefined);
              }}
            />
          }
        />
        <div className="flex gap-2">
          <form.Subscribe
            selector={(state) => state.values.materialType}
            children={(materialType) => (
              <form.AppField
                name="parentId"
                children={(field) =>
                  <field.FormSelect
                    label="Матеріал"
                    valueMode='object'
                    options={materialType === 'materials' ? materialsOptions : fabricsOptions}
                    addOnChange={() => form.setFieldValue('variantId', undefined)}
                  />
                }
              />
            )}
          />
        </div>
        <form.Subscribe
          selector={(state) => ({ parentId: state.values.parentId, materialType: state.values.materialType })}
          children={({ parentId, materialType }) =>
            parentId?.value
              ? <VariantField parentId={parentId.value} materialType={materialType} form={form} />
              : null
          }
        />
        <form.AppField
          name="quantity"
          children={(field) =>
            <field.FormTextNumberField
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
