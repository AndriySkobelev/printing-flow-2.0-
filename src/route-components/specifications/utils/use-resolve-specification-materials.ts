import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { makeOptions } from "@/components/main-form/select/options";
import { type SpecificationMaterials } from "../forms/edit-specifications";

type ResolvableMaterial = { lineId?: string, quantity: string | number, units: string, id: string, type?: 'fabric' | 'material' }

export const useResolveSpecificationMaterials = (materials: Array<ResolvableMaterial>) => {
  const fabricIds = useMemo(() => materials.filter((el) => el.type === 'fabric').map((el) => el.id), [materials]);
  const materialIds = useMemo(() => materials.filter((el) => el.type === 'material').map((el) => el.id), [materials]);

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
      const options = el.type === 'material' ? materialsOptions : fabricOptions;
      const found = options.find((option) => option.value === el.id);
      return {
        ...el,
        type: el.type === 'material' ? 'material' as const : 'fabric' as const,
        id: found,
      }
    }) as SpecificationMaterials[]
  }, [fabricOptions, materialsOptions, materials]);

  return { fabricOptions, materialsOptions, materialsWithType };
}
