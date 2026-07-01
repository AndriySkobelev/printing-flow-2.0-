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
import Divider from "@/components/ui/divider";

export const unitsOptions = [
  {value: 'шт', label: 'шт'},
  {value: 'кг', label: 'кг'},
  {value: 'м', label: 'м'},
  {value: 'см', label: 'см'},
  {value: 'мм', label: 'м'},
];

const selectFieldSchema = z.object({ value: z.union([z.string(), z.number()]), label: z.string() }).optional()

const specificationSchema = z.object({
  name: z.string().min(3, 'Must be an 3 min charts'),
  category: z.string().min(3, 'Must be an 3 min charts'),
  skuPrefix: z.string().min(1, 'Must be an 1 min charts'),
  productionTime: z.string().min(1, 'Must be an 1 min charts'),
  cutTime:        z.string().min(1, 'Must be an 1 min charts'),
  packingTime:    z.string().min(1, 'Must be an 1 min charts'),
  brandingTime:   z.string().min(1, 'Must be an 1 min charts'),
  productionPrice: z.string().min(1, 'Must be an 1 min charts'),
  materials: z.array(z.discriminatedUnion('type', [
    z.object({
      type: z.literal('material'),
      units: z.string(),
      quantity: z.string(),
      materialId: selectFieldSchema,
    }),
    z.object({
      type: z.literal('fabric'),
      units: z.string(),
      quantity: z.string(),
      fabricId: selectFieldSchema,
    }),
    z.object({
      type: z.literal('base'),
      units: z.string(),
      quantity: z.string(),
      fabricId: selectFieldSchema,
    })
  ]))
})

const defaultMaterialValues = {
  type: 'material' as const,
  materialId: undefined,
  quantity: '',
  units: ''
}

const defaultFabricsValues = {
  type: 'fabric' as const,
  fabricId: undefined,
  quantity: '',
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
      productionPrice: '1',
      productionTime: '0',
      cutTime:        '0',
      packingTime:    '0',
      brandingTime:   '0',
      materials: [
        { type: 'base' as const, fabricId: undefined, quantity: '1', units: '' }
      ]
    },
    onSubmit: (value) => {
      actionSubmit(value.value);
    },
  });

  // const formState = useStore(form.store, state => state)
  // console.log("🚀 ~ SpecificationForm ~ formState:", formState)

  return (
    <div>
      <form
        id={formId}
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
        className="flex gap-3"
      >
        <div className="flex flex-col items-center w-full gap-2">
          <span className="text-primary/40">Основна Інформація</span>
          <div className='flex gap-2 w-full'>
            <form.AppField
              name='name'
              children={(field) => <field.FormTextField type="text" label='Назва'/>} />
            <form.AppField
              name='category'
              children={(field) => <field.FormTextField type="text" label='Категорія'/>} />
          </div>
          <div className="flex gap-2 w-full">
            <form.AppField
              name='skuPrefix'
              children={(field) => (
                <field.FormAsyncTextField
                  label='SKU prefix'
                  buildArgs={(value) => ({ skuPrefix: value })}
                  isTaken={(result) => result?.exists === true}
                  query={api.queries.specifications.checkSkuPrefix}
                  takenMessage='Цей SKU префікс вже використовується'
                />
              )} />
            <form.AppField
              name='productionPrice'
              children={(field) => <field.FormTextField type="number" label='Ціна виробництва'/>} />
          </div>
          <div className="flex gap-2 w-full">
            <form.AppField
              name='productionTime'
              children={(field) => <field.FormTextField type="number" label='Час виробництва (хв)'/>} />
            <form.AppField
              name='cutTime'
              children={(field) => <field.FormTextField type="number" label='Час крою (хв)'/>} />
          </div>
          <div className="flex gap-2 w-full">
            <form.AppField
              name='packingTime'
              children={(field) => <field.FormTextField type="number" label='Час пакування (хв)'/>} />
            <form.AppField
              name='brandingTime'
              children={(field) => <field.FormTextField type="number" label='Час брендингу (хв)'/>} />
          </div>
        </div>
        <Divider type="vertical" className="mx-3 bg-primary/5"/>
        <form.Field
          mode="array"
          name='materials'
          >
            {(field) => (
              <div className='flex flex-col gap-2 w-full'>
                  <div className="flex flex-col items-center gap-2 w-full">
                    <span className="text-primary/40">Матеріали</span>
                    {field.state.value.map((value, i) => (
                      <div key={i} className={clsx('flex gap-2 w-full items-end')}>
                        <form.AppField key={`materialId-${i}`} name={!has('fabricId', value) ? `materials[${i}].materialId` : `materials[${i}].fabricId`}
                          children={(subField) => (
                            <subField.FormAsyncSelect
                              className='flex-5'
                              valueMode='object'
                              label={!has('fabricId', value) ? "Матеріал" : 'Тканина'}
                              modeOption='default'
                              asyncOptions={!has('fabricId', value) ? materialOptions : fabricOptions}
                              defaultOptions={!has('fabricId', value) ? defaultMaterialsOptions : defaultFabricOptions}/>
                          )}
                        />
                        <form.AppField key={`quantity-${i}`} name={`materials[${i}].quantity`}
                          children={(subField) => (<subField.FormTextNumberField className="flex-3" type='number' label="Кількість"/>)}
                        />
                        <form.AppField key={`units-${i}`} name={`materials[${i}].units`}
                            children={(subField) => (<subField.FormSelect className="flex-3" options={unitsOptions} placeholder='...' label="Од. виміру"/>)}
                        />
                        {
                          i != 0
                          ? <Button type='button' disabled={i === 0} className="self-end" onClick={() => field.removeValue(i)}><Trash2Icon size={17}/></Button>
                          : null
                        }
                        
                      </div>
                    ))}
                  </div>
                <div className="flex flex-row justify-between gap-2 bg-white py-2 mt-4">
                  <Button className="flex-1 w-full text-primary/80" type="button" variant='secondary' onClick={() => field.pushValue(defaultMaterialValues)}>Додати матеріал</Button>
                  <Button className="flex-1 w-full text-primary/80" type="button" variant='secondary' onClick={() => field.pushValue(defaultFabricsValues)}>Додати Тканину</Button>
                </div>
              </div>
            )}
          </form.Field>
      </form>
    </div>
  );
}
 
export default SpecificationForm;