import clsx from "clsx";
import z from 'zod'
import { type FunctionComponent } from "react";
import { api } from "convex/_generated/api";
import { revalidateLogic } from "@tanstack/react-form";
import { useStore } from "@tanstack/react-form";
import { Trash2Icon } from "lucide-react";
import { Id } from "convex/_generated/dataModel";
import { useAppForm } from "@/components/main-form";
import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useAsyncOptions } from "@/route-components/specifications/utils/hooks";
import { unitsOptions } from "@/route-components/specifications/forms/create-specefication";

const productSchema = z.object({
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

type FormValuesType = z.infer<typeof productSchema>;

interface ChangeMaterialsFormProps {
  formId: string,
  defaultValues?: FormValuesType,
  specificationIds: Array<Id<'specifications'>>,
  actionSubmit: (values: FormValuesType & { fabricName: string }) => void
}
 
const ChangeMaterials: FunctionComponent<ChangeMaterialsFormProps> = ({
  formId,
  defaultValues,
  actionSubmit,
  specificationIds,
}) => {
  const { data } = useQuery(convexQuery(api.queries.specifications.getAllSpecifications, { specs: specificationIds }));
  const { loadOptions: fabricOptions } = useAsyncOptions(api.queries.fabrics.getFabricsOptions);
  const { loadOptions: materialOptions } = useAsyncOptions(api.queries.materials.getMaterialOptions, 'materials');
  console.log("🚀 ~ ChangeMaterials ~ specifications:", data)
  
  const form = useAppForm({
    validationLogic: revalidateLogic(),
    validators: {
      onDynamic: productSchema,
    },
    defaultValues: defaultValues || {
      materials: []
    },
    onSubmit: ({ value }) => {
      
    }
  })
  // const values = useStore(form.store, (state: any) => {
  //   return state.values;
  // });
  // console.log("🚀 ~ ChangeMaterials ~ values:", values)
  // materialId (parent material) -> коли міняєм і є materialId то берем попередній materialId і записуєм як overrideMaterialId, а новий materialId записуєм як materialId. Коли знову міняєм то просто перевіряємо якщо є overrideMaterialId то апдейтаєм тільки materialId
  // а коли додаємо ноновий матеріал, то чекаєм чи є materalId і додаєм isNew: true

  return (
    <>
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
          name='materials'
          >
            {(field) => (
              <div className='flex flex-col gap-2 w-full'>
                {field.state.value.map((_, i) => (
                  <div key={i} className={clsx('flex gap-2 w-full items-end', i === 0 && 'bg-primary/5 border rounded-md p-2')}>
                    <form.AppField key={`materialId-${i}`} name={i != 0 ? `materials[${i}].materialId` : `materials[${i}].fabricId`}
                      children={(subField) => (
                        <subField.FormAsyncSelect
                          className='flex-5'
                          modeOption="smallFabric"
                          label={i != 0 ? "Матеріал" : 'Тканина'}
                          asyncOptions={i != 0 ? materialOptions : fabricOptions}/>
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
    </>
  );
}
 
export default ChangeMaterials;