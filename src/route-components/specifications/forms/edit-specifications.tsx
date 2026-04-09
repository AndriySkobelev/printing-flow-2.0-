import { useQuery } from "@tanstack/react-query";
import { memo, useMemo } from "react";
import SpecificationForm, { SpecificationFormType } from "./create-specefication"
import { convexQuery } from "@convex-dev/react-query";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { makeFabricOptions, makeMaterialsOptions } from "@/components/main-form/select/options";

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
  const { materials } = specification;
  const findFabric = useMemo(() => materials.find((el) => el.fabricId), [specification]);;
  const findMaterials = useMemo(() => materials.filter((el) => el.materialId), [specification]);;
  const materialIds = useMemo(() => findMaterials.map((el) => el.materialId) || [], [findMaterials]);
  const fabricQuery = useQuery({
    ...convexQuery(api.queries.fabrics.getFabricById, { id: findFabric?.fabricId as Id<'fabrics'> }),
    enabled: !!findFabric?.fabricId,
  });
  const fabricData = fabricQuery?.data ? [fabricQuery?.data] : [];
  const materialsQuery = useQuery({
    ...convexQuery(api.queries.materials.getMaterialByIds, { ids: materialIds as Array<Id<'materials'>> }),
    enabled: materialIds.length > 0,
  });
  const materialsData = materialsQuery?.data ? materialsQuery?.data : [];
  const fabricOptions = useMemo(() => makeFabricOptions(fabricData), [fabricQuery, specification]);
  const materialsOptions = useMemo(() => makeMaterialsOptions(materialsData.filter((item) => item !== null)), [materialsQuery, specification]);

  const materialsWithType = useMemo(() => {
    const materialsData = materials.map(el => {
      if ('fabricId' in el) {
        const findFabric = fabricOptions.find((fabric) => fabric.value === el.fabricId);
        return {
          ...el,
          type: 'fabric' as const,
          fabricId: findFabric && findFabric,
        }
      }
      const findMaterial = materialsOptions.find((fabric) => fabric.value === el.materialId);
      return {
        ...el,
        materialId: findMaterial && findMaterial,
        type: 'material' as const,
    }})
    return materialsData;
  }, [fabricOptions, materialsOptions]) as SpecificationMaterials[]
  return (
    <div>
      <SpecificationForm
        formId={formId}
        actionSubmit={actionSubmit}
        defaultValues={{ ...specification, materials: materialsWithType }} 
        defaultFabricOptions={fabricOptions}
        defaultMaterialsOptions={materialsOptions}/>
    </div>
  )
});