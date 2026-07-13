import z from 'zod';
import { type FunctionComponent } from 'react';
import { useAppForm } from '@/components/main-form';
import { revalidateLogic } from '@tanstack/react-form';
import { productSizes } from '@/constants';
import { unitsOptions } from '@/route-components/specifications/forms/create-specification';
import { api } from 'convex/_generated/api';

const sizeOptions = productSizes.map(s => ({ value: s, label: s }));

const formSchema = z.object({
  name: z.string().min(1, 'Введіть назву'),
  units: z.string().min(1, 'Введіть одиниці'),
  category: z.string().min(1, 'Введіть категорію'),
  skuPrefix: z.string().min(1, 'Введіть SKU префікс'),
  material: z.string(),
  colors: z.array(z.object({ value: z.string(), label: z.string() })).min(1, 'Додайте хоча б один колір'),
  sizes: z.array(z.object({ value: z.string(), label: z.string() }))
});

type MaterialFormRaw = z.infer<typeof formSchema>;
export type MaterialFormType = Omit<MaterialFormRaw, 'colors' | 'sizes'> & {
  colors: string[];
  sizes?: string[];
};

interface MaterialFormProps {
  formId: string;
  defaultValues?: Partial<MaterialFormType>;
  actionSubmit: (values: MaterialFormType) => void;
}

const toOptions = (arr?: string[]) => (arr ?? []).map(v => ({ value: v, label: v }));

const MaterialForm: FunctionComponent<MaterialFormProps> = ({ formId, defaultValues, actionSubmit }) => {
  const form = useAppForm({
    validationLogic: revalidateLogic(),
    validators: { onDynamic: formSchema },
    defaultValues: {
      name: defaultValues?.name ?? '',
      units: defaultValues?.units ?? '',
      category: defaultValues?.category ?? '',
      skuPrefix: defaultValues?.skuPrefix ?? '',
      material: defaultValues?.material ?? '',
      colors: toOptions(defaultValues?.colors),
      sizes: toOptions(defaultValues?.sizes),
    },
    onSubmit: ({ value }) => actionSubmit({
      ...value,
      colors: value.colors.map(c => c.value),
      sizes: value.sizes?.map(s => s.value),
    }),
  });

  return (
    <form
      id={formId}
      onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }}
      className="flex flex-col gap-3"
    >
      <div className="flex gap-2">
        <form.AppField name="name" children={(field) => <field.FormTextField label="Назва" />} />
        <form.AppField name="category" children={(field) => <field.FormTextField label="Категорія" />} />
      </div>
      <div className="flex gap-2">
        <form.AppField name="skuPrefix" children={(field) =>
          <field.FormAsyncTextField
            label='SKU prefix'
            query={api.queries.materials.checkMaterialSkuPrefix}
            buildArgs={(value) => ({ skuPrefix: value })}
            isTaken={(result) => result?.exists === true}
            takenMessage='Цей SKU префікс вже використовується'
          />
        } />
        <form.AppField name="units" children={(field) => <field.FormSelect label="Одиниці" options={unitsOptions} />} />
        <form.AppField name="material" children={(field) => <field.FormTextField label="Склад" placeholder="бавовна, сатин..." />} />
      </div>
      <div className="flex gap-2">
        <form.AppField
          name="colors"
          children={(field) => (
            <field.FormCreatableSelect isMulti={true} options={[]} label="Кольори" />
          )}
        />
        <form.AppField
          name="sizes"
          children={(field) => (
            <field.FormCreatableSelect isMulti={true} options={sizeOptions} label="Розміри" />
          )}
        />
      </div>
    </form>
  );
};

export default MaterialForm;
