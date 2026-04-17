import z from 'zod';
import { type FunctionComponent } from 'react';
import { useAppForm } from '@/components/main-form';
import { revalidateLogic } from '@tanstack/react-form';

const formSchema = z.object({
  name: z.string().min(1, 'Введіть назву'),
  color: z.string().min(1, 'Введіть колір'),
  units: z.string().min(1, 'Введіть одиниці'),
  category: z.string().min(1, 'Введіть категорію'),
  size: z.string().optional(),
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
      name: '',
      color: '',
      units: '',
      category: '',
      size: '',
      ...defaultValues,
    },
    onSubmit: ({ value }) => actionSubmit(value as MaterialEditFormType),
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
        <form.AppField name="color" children={(field) => <field.FormTextField label="Колір" />} />
        <form.AppField name="size" children={(field) => <field.FormTextField label="Розмір" />} />
      </div>
      <form.AppField name="units" children={(field) => <field.FormTextField label="Одиниці" />} />
    </form>
  );
};

export default MaterialEditForm;
