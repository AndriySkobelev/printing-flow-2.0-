import z from 'zod';
import clsx from 'clsx';
import { Key, type FunctionComponent } from 'react';
import { revalidateLogic } from "@tanstack/react-form";
import { useAppForm } from '@/components/main-form';
import { Button } from '@/components/ui/button';
import { PlusIcon } from 'lucide-react';
import { useAsyncOptions } from '@/hooks';
import { api } from 'convex/_generated/api';
 
interface WorkPerformedFormProps {
  formId: string,
  defaultValues?: any,
}

const formSchema = z.object({
  products: z.array(z.object({
    name: z.string(),
    quantity: z.number(),
  })),
});

const defaultFormValues = {
  products: [
    {
      name: '',
      quantity: 0,
    }
  ]
}
 
const WorkPerformedForm: FunctionComponent<WorkPerformedFormProps> = ({ formId, defaultValues }) => {
  const { loadOptions: loadFabricOptions } = useAsyncOptions(api.queries.fabrics.getFabricsOptions, 'fabric')
  const form = useAppForm({
    validationLogic: revalidateLogic(),
    validators: {
      onDynamic: formSchema,
    },
    defaultValues: defaultValues || defaultFormValues,
    onSubmit: ({ value }) => {
      console.log("🚀 ~ ChangeMaterials ~ value:", value)

    }
  });
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
          mode="array"
          name='products'
          >
           {(field) => (<div>
              {field.state.value.map((_: any, i: number) => (
                <div key={i} className={clsx('flex gap-2 w-full items-end')}>
                <form.AppField key={`products-${i}`} name={`products[${i}].fabricId`}
                  children={(subField) => (
                    <subField.FormAsyncSelect
                      className='flex-5'
                      label='Виріб'
                      asyncOptions={loadFabricOptions}/>
                  )}
                />
                <form.AppField key={`quantity-${i}`} name={`materials[${i}].quantity`}
                  children={(subField) => (<subField.FormTextField className="flex-3" type='number' label="Кількість"/>)}
                />
                <Button type='button' disabled={i === 0} className="self-end" onClick={() => field.removeValue(i)}><PlusIcon size={17}/></Button>
              </div>
              ))}
           </div>)}
          </form.Field>
      </form>
    </div>
  );
}
 
export default WorkPerformedForm;