import { type FunctionComponent } from "react";
import { Trash2Icon } from 'lucide-react'
import { z } from 'zod';
import { has } from 'ramda';
import clsx from "clsx";
import { revalidateLogic } from '@tanstack/react-form';
import { useAppForm } from "@/components/main-form";
import { Button } from "@/components/ui/button";
import { useAsyncOptions } from '../utils/hooks'
import { api } from "convex/_generated/api";
import { Option } from "@/components/main-form/select/form-select";

export const unitsOptions = [
  {value: 'шт', label: 'шт'},
  {value: 'кг', label: 'кг'},
  {value: 'м', label: 'м'},
  {value: 'см', label: 'см'},
  {value: 'мм', label: 'м'},
];

const specificationSchema = z.object({
  name: z.string().min(3, 'Must be an 3 min charts'),
  category: z.string().min(3, 'Must be an 3 min charts'),
  skuPrefix: z.string().min(1, 'Must be an 1 min charts'),
  materials: z.array(z.object({
    units: z.string(),
    quantity: z.number().min(0.01, 'Must be an 0.01 min number'),
    fabricId: z.string().optional(),
    materialId: z.string().optional(),
  }))
})

const defaultMaterialValues = {
  materialId: '',
  quantity: 0,
  units: ''
}

export type SpecificationFormType = z.infer<typeof specificationSchema>

interface SpecificationFormProps {
  formId: string,
  defaultValues?: SpecificationFormType,
  defaultFabricOptions?: Array<Option>,
  defaultMaterialsOptions?: Array<Option>,
  actionSubmit: (values: SpecificationFormType | SpecificationFormType & { _id: string, _creationTime: string}) => void,
}

const SpecificationForm: FunctionComponent<SpecificationFormProps> = ({
  formId,
  actionSubmit,
  defaultValues,
  defaultFabricOptions,
  defaultMaterialsOptions
}) => {
  const { loadOptions: fabricOptions } = useAsyncOptions(api.queries.fabrics.getFabricsOptions);
  const { loadOptions: materialOptions } = useAsyncOptions(api.queries.materials.getMaterialOptions, 'materials');


  const form = useAppForm({
    validationLogic: revalidateLogic(),
    validators: {
      onDynamic: specificationSchema,
    },
    defaultValues: defaultValues || {
      name: '',
      category: '',
      skuPrefix: '',
      materials: [
        { quantity: 0, units: '' }
      ]
    },
    onSubmit: (value) => actionSubmit(value.value),
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
        <form.AppField
          name='name'
          children={(field) => <field.FormTextField type="text" label='Назва'/>} />
        <form.AppField
          name='category'
          children={(field) => <field.FormTextField type="text" label='Категорія'/>} />
        <form.AppField
          name='skuPrefix'
          children={(field) => <field.FormTextField type="text" label='SKU prefix'/>} />
        <form.Field
          mode="array"
          name='materials'
          >
            {(field) => (
              <div className='flex flex-col gap-2 w-full'>
                {field.state.value.map((value, i) => (
                  <div key={i} className={clsx('flex gap-2 w-full items-end', i === 0 && 'bg-primary/5 border rounded-md p-2')}>
                    <form.AppField key={`materialId-${i}`} name={i != 0 ? `materials[${i}].materialId` : `materials[${i}].fabricId`}
                      children={(subField) => (
                        <subField.FormAsyncSelect
                          className='flex-5'
                          label={i != 0 ? "Матеріал" : 'Тканина'}
                          modeOption={i != 0  ? 'materials' : 'fabric'}
                          asyncOptions={i != 0  ? materialOptions : fabricOptions}
                          defaultOptions={i != 0  ? defaultMaterialsOptions : defaultFabricOptions}/>
                      )}
                    />
                    <form.AppField key={`quantity-${i}`} name={`materials[${i}].quantity`}
                      children={(subField) => (<subField.FormTextField className="flex-3" type='number' label="Кількість"/>)}
                    />
                     <form.AppField key={`units-${i}`} name={`materials[${i}].units`}
                      children={(subField) => (<subField.FormSelect className="flex-3" options={unitsOptions} label="Од. виміру"/>)}
                    />
                    {
                      i != 0
                      ? <Button type='button' disabled={i === 0} className="self-end" onClick={() => field.removeValue(i)}><Trash2Icon size={17}/></Button>
                      : null
                    }
                    
                  </div>
                ))}
                <Button type="button" variant='secondary' onClick={() => field.pushValue(defaultMaterialValues)}>Додати матеріал</Button>
              </div>
            )}
          </form.Field>
      </form>
    </div>
  );
}
 
export default SpecificationForm;