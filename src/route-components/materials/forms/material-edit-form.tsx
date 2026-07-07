import z from 'zod';
import { type FunctionComponent } from 'react';
import { useAppForm } from '@/components/main-form';
import { revalidateLogic } from '@tanstack/react-form';
import { unitsOptions } from '@/route-components/specifications/forms/create-specification';

const formSchema = z.object({
  name: z.string().min(1, 'Введіть назву'),
  units: z.string().min(1, 'Введіть одиниці'),
  category: z.string().min(1, 'Введіть категорію'),
  material: z.string(),
});

export type MaterialEditFormType = z.infer<typeof formSchema>;

interface MaterialEditFormProps {
  formId: string;
  defaultValues?: Partial<MaterialEditFormType>;
  actionSubmit: (values: MaterialEditFormType) => void;
}

const MaterialEditForm: FunctionComponent<MaterialEditFormProps> = ({ formId, defaultValues, actionSubmit }) => {
  const form = useAppForm({
    validationLogic: revalidateLogic(),
    validators: { onDynamic: formSchema },
    defaultValues: {
      name: defaultValues?.name ?? '',
      units: defaultValues?.units ?? '',
      category: defaultValues?.category ?? '',
      material: defaultValues?.material ?? '',
    },
    onSubmit: ({ value }) => actionSubmit(value),
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
        <form.AppField name="units" children={(field) => <field.FormSelect label="Одиниці" options={unitsOptions} />} />
        <form.AppField name="material" children={(field) => <field.FormTextField label="Склад" placeholder="бавовна, сатин..." />} />
      </div>
    </form>
  );
};

export default MaterialEditForm;
