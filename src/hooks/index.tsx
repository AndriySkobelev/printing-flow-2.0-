import { useConvex } from "convex/react";
import { makeFabricOptions, makeMaterialsOptions, makeProductOptions } from '@/components/main-form/select/options';

const developOptions = {
  fabric: makeFabricOptions,
  products: makeProductOptions,
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