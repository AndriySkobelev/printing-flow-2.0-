import { useQuery } from "@tanstack/react-query";
import { memo, useMemo } from "react";
import SpecificationForm, { SpecificationFormType } from "./create-specefication"
import { convexQuery } from "@convex-dev/react-query";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { makeFabricOptions, makeMaterialsOptions } from "@/components/main-form/select/options";

interface EditSpecificationsProps {
  formId: string,
  specification: SpecificationFormType,
  actionSubmit: (values: SpecificationFormType | SpecificationFormType & { _id: Id<'specifications'>, _creationTime: string}) => void,
}

export const EditSpecifications = memo(({ specification, formId, actionSubmit }: EditSpecificationsProps) => {
  const { materials } = specification;
  const findFabric = useMemo(() => materials.find((el) => el.fabricId), [specification]);;
  const findMaterials = useMemo(() => materials.filter((el) => el.materialId), [specification]);;
  const materialIds = useMemo(() => findMaterials.map((el) => el.materialId) || [], [findMaterials]);
  const fabricQuery = findFabric && useQuery(convexQuery(api.queries.fabrics.getFabricById, { id: findFabric?.fabricId as Id<'fabrics'> }));
  const fabricData = fabricQuery?.data ? [fabricQuery?.data] : [];
  const materialsQuery = materialIds && useQuery(convexQuery(api.queries.materials.getMaterialByIds, { ids: materialIds as Array<Id<'materials'>> }));
  const materialsData = materialsQuery?.data ? materialsQuery?.data : [];
  const fabricOptions = useMemo(() => makeFabricOptions(fabricData), [fabricData]);
  const materialsOptions = useMemo(() => makeMaterialsOptions(materialsData.filter((item) => item !== null)), [fabricData]);

  return (
    <div>
      <SpecificationForm
        formId={formId}
        actionSubmit={actionSubmit}
        defaultValues={specification} 
        defaultFabricOptions={fabricOptions}
        defaultMaterialsOptions={materialsOptions}/>
    </div>
  )
});