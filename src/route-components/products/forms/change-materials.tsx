import clsx from "clsx";
import z from 'zod'
import { useState, type FunctionComponent } from "react";
import { api } from "convex/_generated/api";
import { revalidateLogic } from "@tanstack/react-form";
import { useStore } from "@tanstack/react-form";

import { prepend, append, has } from "ramda";
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
    fabricId: z.string().optional(),
    materialId: z.string().optional(),
    overwriteMaterialId: z.string().optional(),
    multiplier: z.number().min(0.01, 'Must be an 0.01 min number'),
  }))
})

const defaultMaterialValues = {
  isNew: true,
  units: '',
  multiplier: 0,
  materialId: '',
}

type FormValuesType = Omit<z.infer<typeof productSchema>, 'quantity'>;

interface ChangeMaterialsFormProps {
  formId: string,
  defaultValues?: FormValuesType,
  specificationIds: Array<Id<'specifications'>>,
  actionSubmit: (values: FormValuesType & { fabricName: string }) => void
}

const ChangedMaterials = ({
  data,
  handleChangeMaterial,
}: {
  data: any,
  handleChangeMaterial: (data: any) => void
}) => {
  const [checked, setChecked] = useState<Array<string>>([]);

  const handleClickMaterial = (material: any, specId: string, materialIndex: number) => {
    if (checked.includes(material?.materialId || material.fabricId)) {
      setChecked((prev) => prev.filter((id) => id !== (material?.materialId || material.fabricId)));
      handleChangeMaterial({ ...material, specId, materialIndex })
      return;
    }
    handleChangeMaterial({ ...material, specId, materialIndex })
    setChecked((prev) => [...prev, material?.materialId || material.fabricId]);
  }
  
  return (
    <div>
    {
      data 
      ? data.map((spec: any, i: number) => (
        <div key={`${spec?.name}-${i}`} className="mb-2">
          <div className="font-medium">{spec?.name}</div>
          <div className="flex gap-1 mt-1 justify-between">
            {
              spec?.materials.map((material: any, j: number) => (
                <div
                  key={`${material?.name}-${j}`}
                  className={clsx(
                    "flex flex-col items-start gap-1 text-sm bg-primary/5 rounded-md px-2 py-1 cursor-pointer hover:bg-primary/10",
                    checked.includes(material?.materialId || material.fabricId) && 'bg-green-100 border border-green-300'
                  )}
                  onClick={() => handleClickMaterial(material, spec._id, j)}
                >
                  <div>{material?.name}{material?.size ? `-${material?.size}` : ''}</div>
                  <div className="flex items-start gap-0.5">
                    <div className="text-[#868686]">{material?.color}</div>
                    <div className="text-[#706f6f]">({material?.quantity}{material?.units})</div>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      ))
      : null
    }
  </div>
  )
}

const ChangeMaterials: FunctionComponent<ChangeMaterialsFormProps> = ({
  formId,
  defaultValues,
  actionSubmit,
  specificationIds,
}) => {
  const { data } = useQuery(convexQuery(api.queries.specifications.getSpecsWithMaterials, { specs: specificationIds }));
  const { loadOptions: fabricOptions } = useAsyncOptions(api.queries.fabrics.getFabricsOptionsByColor);
  const { loadOptions: materialOptions } = useAsyncOptions(api.queries.materials.getMaterialOptions, 'materials');
  const form = useAppForm({
    validationLogic: revalidateLogic(),
    validators: {
      onDynamic: productSchema,
    },
    defaultValues: defaultValues || {
      materials: []
    },
    onSubmit: ({ value }) => {
      actionSubmit(value as any)
    }
  })

  const handleChangeMaterial = (material: {
    materialId?: string;
    fabricId?: string;
    units: string;
    multiplayer: number;
  }) => {
    const materials = form.getFieldValue('materials');
    
    const { materialId, fabricId } = material;
    const findMaterial = materials?.find((m: any) => fabricId ? m.overwriteMaterialId === fabricId : m.overwriteMaterialId === materialId);

    if (findMaterial) {
      // const filtered = materials.filter((m: any) => m.fabricId ? m.fabricId === fabricId ? false : true : m.materialId === materialId ? false : true);
      form.removeFieldValue('materials', materials.indexOf(findMaterial));
      // form.setFieldValue('materials', filtered);
    } else {
      const hasFabric = has('fabricId', material);
      const addMaterial = hasFabric ? prepend({
        fabricId: '',
        multiplier: 0,
        overwriteMaterialId: materialId || fabricId,
      }, materials) : append({
        materialId: '',
        multiplier: 0,
        overwriteMaterialId: materialId || fabricId,
      }, materials);
      form.setFieldValue('materials', addMaterial);
    }
  }

  // const values = useStore(form.store, (state: any) => {
  //   return state.values;
  // });
  // console.log("🚀 ~ ChangeMaterials ~ values:", values)

  return (
    <div>
      <ChangedMaterials data={data} handleChangeMaterial={handleChangeMaterial} />
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
                {field.state.value.map((value, i) => (
                  <div key={i} className={clsx('flex gap-2 w-full items-end', has('fabricId', value) && 'bg-primary/5 border rounded-md p-2')}>
                    <form.AppField key={`materialId-${i}`} name={!has('fabricId', value) ? `materials[${i}].materialId` : `materials[${i}].fabricId`}
                      children={(subField) => (
                        <subField.FormAsyncSelect
                          className='flex-5'
                          label={!has('fabricId', value) ? "Матеріал" : 'Тканина'}
                          modeOption={!has('fabricId', value) ? 'materials' : 'fabric'}
                          asyncOptions={!has('fabricId', value) ? materialOptions : fabricOptions}/>
                      )}
                    />
                    <form.AppField key={`multiplier-${i}`} name={`materials[${i}].multiplier`}
                      children={(subField) => (<subField.FormTextField className="flex-3" type='number' label="Множник"/>)}
                    />
                    {
                      has('isNew', value)
                      ? <Button type='button' disabled={i === 0} className="self-end" onClick={() => field.removeValue(i)}><Trash2Icon size={17}/></Button>
                      : null
                    }
                    
                  </div>
                ))}
                {/* <Button type="button" variant='secondary' onClick={() => field.pushValue(defaultMaterialValues)}>Додати матеріал</Button> */}
              </div>
            )}
          </form.Field>
      </form>
    </div>
  );
}
 
export default ChangeMaterials;