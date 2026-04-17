import z from 'zod';
import { type FunctionComponent } from 'react';
import { useAppForm } from '@/components/main-form';
import { revalidateLogic } from '@tanstack/react-form';
import { productSizes } from '@/constants';
import { unitsOptions } from '@/route-components/specifications/forms/create-specefication';

const sizeOptions = productSizes.map(s => ({ value: s, label: s }));

const formSchema = z.object({
  name: z.string().min(1, 'Введіть назву'),
  units: z.string().min(1, 'Введіть одиниці'),
  category: z.string().min(1, 'Введіть категорію'),
  skuPrefix: z.string().min(1, 'Введіть SKU префікс'),
  colors: z.array(z.object({ value: z.string(), label: z.string() })).min(1, 'Додайте хоча б один колір'),
  sizes: z.array(z.object({ value: z.string(), label: z.string() })).optional(),
});

export type MaterialFormType = z.infer<typeof formSchema>;

interface MaterialFormProps {
  formId: string;
  defaultValues?: Partial<MaterialFormType>;
  actionSubmit: (values: MaterialFormType) => void;
}

const MaterialForm: FunctionComponent<MaterialFormProps> = ({ formId, defaultValues, actionSubmit }) => {
  const form = useAppForm({
    validationLogic: revalidateLogic(),
    validators: { onDynamic: formSchema },
    defaultValues: defaultValues || {
      name: '',
      units: '',
      category: '',
      skuPrefix: '',
      colors: [],
      sizes: [],
    },
    onSubmit: ({ value }) => actionSubmit(value as MaterialFormType),
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
        <form.AppField name="skuPrefix" children={(field) => <field.FormTextField label="SKU префікс" />} />
        <form.AppField name="units" children={(field) => <field.FormSelect label="Одиниці" options={unitsOptions} />} />
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
