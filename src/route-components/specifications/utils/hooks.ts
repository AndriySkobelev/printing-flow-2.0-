import { useConvex } from "convex/react";
import { makeFabricOptions, makeMaterialsOptions } from '@/components/main-form/select/options';

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
    console.log("🚀 ~ loadOptions ~ optionsData:", optionsData)

    return developOptions[optionsMode](optionsData ?? []);
  };

  return { loadOptions };
}