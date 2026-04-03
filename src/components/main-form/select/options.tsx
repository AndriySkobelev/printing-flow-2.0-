import { type Option } from '@/components/main-form/select/form-select' 

export const makeFabricOptions =<T,> (data: Array<T & { color: string, fabricName: string, sku: string, _id: string}>): Array<Option> => {
  const operationData = data || [];
  return operationData.map((item) => ({
    value: item._id,
    label: `${item.fabricName} · ${item.color} · ${item.sku}` as string,
  }))
}

export const makeEditFabricOptions =<T,> (data: Array<T & { color: string, name: string, sku: string, _id: string}>): Array<Option> => {
  if (!data) return [];
  const operationData = data || [];
  return operationData.map((item) => ({
    value: item._id,
    label: `${item.name} · ${item.color} · ${item.sku}` as string,
  }))
}

export const makeMaterialsOptions =<T,> (data: Array<T & { color?: string, size?: string, name?: string, sku?: string, _id: string}>): Array<Option> => {
  const operationData = data || [];
  if (!data) return [];
  return operationData.map((item) => ({
    value: item._id,
    label: `${item.name} · ${item.size} · ${item.color} · ${item.sku}` as string,
  }))
}

export const makeProductOptions =<T,> (data: Array<T & { color?: string, size?: string, price?: number, name?: string, sku?: string, _id: string}>): Array<Option> => {
  const operationData = data || [];
  console.log('operationData', operationData)
  if (!data) return [];
  return operationData.map((item) => ({
    value: item._id,
    price: item?.price,
    label: `${item.name} · ${item.size} · ${item.color} · ${item.sku}` as string,
  }))
}

export const makeOptions =<T,> (data: Array<T>, labelName: keyof T, valueName: keyof T): Array<Option> => {
  const operationData = data || [];
  return operationData.map((item) => ({
    value: item[valueName] as string | number,
    label: item[labelName] as string,
  }))
}