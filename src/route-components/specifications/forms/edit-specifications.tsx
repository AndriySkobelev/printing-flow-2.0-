import { memo } from "react";
import SpecificationForm, { SpecificationFormType } from "./create-specification"
import { Id } from "convex/_generated/dataModel";
import { useResolveSpecificationMaterials } from "../utils/use-resolve-specification-materials";

export type SpecificationMaterials = SpecificationFormType['materials'][number]
interface EditSpecificationsProps {
  formId: string,
  specification: Omit<SpecificationFormType, 'materials'> & { materials: Array<{ lineId?: string, quantity: string | number, units: string, id: string, type?: 'fabric' | 'material' }> },
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