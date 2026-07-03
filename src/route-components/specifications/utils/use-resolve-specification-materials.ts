import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { makeOptions } from "@/components/main-form/select/options";
import { type SpecificationMaterials } from "../forms/edit-specifications";

type ResolvableMaterial = Pick<SpecificationMaterials, 'quantity' | 'type' | 'units'> & { materialId?: string, fabricId?: string }

export const useResolveSpecificationMaterials = (materials: Array<ResolvableMaterial>) => {
  const findFabric = useMemo(() => materials.filter((el) => el.fabricId), [materials]);
  const fabricIds = useMemo(() => findFabric.map((el) => el.fabricId) || [], [findFabric]);

  const findMaterials = useMemo(() => materials.filter((el) => el.materialId), [materials]);
  const materialIds = useMemo(() => findMaterials.map((el) => el.materialId) || [], [findMaterials]);

  const fabricQuery = useQuery({
    ...convexQuery(api.queries.fabrics.getFabricByIds, { ids: fabricIds as Id<'fabrics'>[] }),
    enabled: fabricIds.length > 0,
  });
  const fabricData = fabricQuery?.data ? fabricQuery.data.filter((item) => item !== null) : [];
  const materialsQuery = useQuery({
    ...convexQuery(api.queries.materials.getMaterialByIds, { ids: materialIds as Array<Id<'materials'>> }),
    enabled: materialIds.length > 0,
  });
  const materialsData = materialsQuery?.data ? materialsQuery?.data : [];
  const fabricOptions = useMemo(() => makeOptions(fabricData, 'name', '_id'), [fabricQuery, materials]);
  const materialsOptions = useMemo(() => makeOptions(materialsData.filter((item) => item !== null), 'name', '_id'), [materialsQuery, materials]);

  const materialsWithType = useMemo(() => {
    return materials.map(el => {
      if ('fabricId' in el) {
        const findFabric = fabricOptions.find((fabric) => fabric.value === el.fabricId);
        return {
          quantity: el.quantity,
          units: el.units,
          type: 'fabric' as const,
          fabricId: findFabric,
        }
      }
      const findMaterial = materialsOptions.find((fabric) => fabric.value === el.materialId);
      return {
        quantity: el.quantity,
        units: el.units,
        materialId: findMaterial,
        type: 'material' as const,
      }
    }) as SpecificationMaterials[]
  }, [fabricOptions, materialsOptions, materials]);

  return { fabricOptions, materialsOptions, materialsWithType };
}
