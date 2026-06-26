import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query';
import { useStore } from "@tanstack/react-form";
import { convexQuery } from '@convex-dev/react-query';
import { type Fabrics } from 'convex/schema';
import { api } from 'convex/_generated/api';
import { makeOptions } from '@/components/main-form/select/options';

export const useAllColorsByFabric = (specification: any, data: any) => {
  const findSpec = data?.find((el: any) => el._id === specification);
  const findSpecFabric = findSpec?.materials.find((el: any) => el ? 'fabricName' in el : null) as Fabrics;
  const { data: fabricColors } = useQuery(convexQuery(api.queries.fabrics.getFabricsByName, { fabricName: findSpecFabric?.fabricName }));
  const options = makeOptions(fabricColors || [], 'color', 'color')

  return options || [];
}