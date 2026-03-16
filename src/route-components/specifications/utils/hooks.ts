import { useConvex } from "convex/react";
import { makeFabricOptions, makeMaterialsOptions } from '@/components/main-form/select/options';
import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "convex/_generated/api";
import { useMutation } from "@tanstack/react-query";

const developOptions = {
  fabric: makeFabricOptions,
  materials: makeMaterialsOptions
};

type DevelopOptionsType = typeof developOptions

export const useAsyncOptions = (apiPath: any, optionsMode: keyof DevelopOptionsType = 'fabric') => {
  const convex = useConvex();

  const loadOptions = async (data: { inputValue: string }) => {
    if (!data.inputValue) return [];

    const optionsData = await convex.query(
      apiPath,
      data
    );

    return developOptions[optionsMode](optionsData ?? []);
  };

  return { loadOptions };
};

export function useDeleteSpecification() {
  const mutationFn = useConvexMutation(
    api.queries.specifications.deleteSpecification,
  )

  return useMutation({ mutationFn })
}

export function useUpdateSpecification() {
  const mutationFn = useConvexMutation(
    api.queries.specifications.updateSpecification,
  )

  return useMutation({ mutationFn })
}

export function useDuplicateSpecification() {
  const mutationFn = useConvexMutation(
    api.queries.specifications.duplicateSpecification,
  )

  return useMutation({ mutationFn })
}