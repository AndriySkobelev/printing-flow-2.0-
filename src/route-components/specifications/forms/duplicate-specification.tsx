import { type MutableRefObject, memo } from "react";
import SpecificationForm, { SpecificationFormType } from "./create-specification"
import { useResolveSpecificationMaterials } from "../utils/use-resolve-specification-materials";

interface DuplicateSpecificationProps {
  formId: string,
  specification: Omit<SpecificationFormType, 'materials'> & { materials: Array<{ lineId?: string, quantity: string | number, units: string, id: string, type?: 'fabric' | 'material' }> },
  formApiRef?: MutableRefObject<(() => SpecificationFormType) | null>,
  actionSubmit: (values: SpecificationFormType) => void,
}

export const DuplicateSpecification = memo(({ specification, formId, actionSubmit, formApiRef }: DuplicateSpecificationProps) => {
  const { fabricOptions, materialsOptions, materialsWithType } = useResolveSpecificationMaterials(specification.materials);

  return (
    <div>
      <SpecificationForm
        formId={formId}
        formApiRef={formApiRef}
        actionSubmit={actionSubmit}
        defaultValues={{ ...specification, name: `${specification.name} копія`, skuPrefix: '', materials: materialsWithType }}
        defaultFabricOptions={fabricOptions}
        defaultMaterialsOptions={materialsOptions}/>
    </div>
  )
});
