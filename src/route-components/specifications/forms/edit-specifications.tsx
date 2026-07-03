import { memo } from "react";
import SpecificationForm, { SpecificationFormType } from "./create-specification"
import { Id } from "convex/_generated/dataModel";
import { useResolveSpecificationMaterials } from "../utils/use-resolve-specification-materials";

type Prettify<T> = { [K in keyof T]: T[K] } & {}
export type SpecificationMaterials = SpecificationFormType['materials'][number]
export type OmitMaterialsType = Omit<SpecificationMaterials, 'fabricId' | 'materialId'>
export type MaterialsOmitType = Prettify<{ materialId?: string, fabricId?: string } & OmitMaterialsType>
interface EditSpecificationsProps {
  formId: string,
  specification: Omit<SpecificationFormType, 'materials'> & { materials: Array<Pick<SpecificationMaterials, 'quantity' | 'type' | 'units'> & { materialId?: string, fabricId?: string}> },
  actionSubmit: (values: SpecificationFormType | SpecificationFormType & { _id: Id<'specifications'>, _creationTime: string}) => void,
}

export const EditSpecifications = memo(({ specification, formId, actionSubmit }: EditSpecificationsProps) => {
  const { fabricOptions, materialsOptions, materialsWithType } = useResolveSpecificationMaterials(specification.materials);

  return (
    <div>
      <SpecificationForm
        isEdit
        formId={formId}
        actionSubmit={actionSubmit}
        defaultValues={{ ...specification, materials: materialsWithType }}
        defaultFabricOptions={fabricOptions}
        defaultMaterialsOptions={materialsOptions}/>
    </div>
  )
});