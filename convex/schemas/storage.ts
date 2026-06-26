import { v } from "convex/values";
import { defineTable } from 'convex/server';

export enum TransactionType { INCOMING = 'incoming', OUTGOING = 'outgoing', RESERVE='reserve' }
export const TRANSACTION_TYPES = { INCOMING: 'incoming', OUTGOING: 'outgoing', RESERVE: 'reserve' } as const;

export const fabricsSchema = {
  name: v.string(),
  skuPrefix: v.string(),
  units: v.union(v.literal('кг'), v.literal('м')),
  processingType: v.optional(v.union(v.string(), v.null())),
  updatedAt: v.optional(v.string()),
  lastIndexVariant: v.optional(v.number()),
};

export const fabricVariantsSchema = {
  color: v.string(),
  skuNumber: v.number(),
  sku: v.string(),
  threds: v.optional(v.union(v.string(), v.null())),
  parentId: v.id('fabrics'),
};

export const materialsSchema = {
  name: v.string(),
  sku: v.string(),
  color: v.string(),
  units: v.string(),
  category: v.string(),
  skuNumber: v.number(),
  skuPrefix: v.string(),
  code: v.optional(v.string()),
  size: v.optional(v.string()),
  material: v.optional(v.string()), // сатини, бавовна, джинс
  searchText: v.optional(v.string()),
};

export const storeMovementsSchema = {
  quantity: v.union(v.number(), v.string()),
  materialType: v.union(v.literal('fabrics'), v.literal('materials')),
  materialId: v.union(v.id('materials'), v.id('fabrics')),
  type: v.union(
    v.literal(TRANSACTION_TYPES['INCOMING']),
    v.literal(TRANSACTION_TYPES['OUTGOING']),
    v.literal(TRANSACTION_TYPES['RESERVE'])
  ),
  //// OPTIONAL FIELDS
  orderId: v.optional(v.number()),
  manager: v.optional(v.string()),
  description: v.optional(v.string()),
  orderShippingDate: v.optional(v.string()),
  productInfo: v.optional(v.array(v.string())),
  productQuantity: v.optional(v.union(v.number(), v.string())),
}

export const productsSpecification = {
  name: v.string(),
  category: v.string(),
  skuPrefix: v.string(),
  productionPrice: v.optional(v.union(v.number(), v.string())),
  productionTime:  v.optional(v.union(v.number(), v.string())),
  cutTime:         v.optional(v.union(v.number(), v.string())),
  packingTime:     v.optional(v.union(v.number(), v.string())),
  brandingTime:    v.optional(v.union(v.number(), v.string())),
  customSizes: v.optional(v.array(v.string())),
  materials: v.array(v.object({
    units: v.string(),
    quantity: v.union(v.number(), v.string()),
    materialName: v.optional(v.string()),
    fabricId: v.optional(v.id('fabrics')),
    materialId: v.optional(v.id('materials')),
    type: v.optional(v.union(v.literal('fabric'), v.literal('material'), v.literal('base'))),
  })),
  lastVariantIndex: v.optional(v.number()),
  attachedFiles: v.optional(v.array(v.object({
    url: v.string(),
    name: v.string(),
    contentType: v.optional(v.string()),
  }))),
}

export const productVariants = {
  sku: v.string(),
  size: v.string(),
  color: v.string(),
  skuNumber: v.number(),
  style: v.optional(v.string()),
  parentId: v.id('specifications'),
  searchText: v.optional(v.string()),
  synced_at: v.optional(v.number()), // час коли останній раз синхронізували з keycrm
  processingType: v.optional(v.union(v.string(), v.null())),
  materials: v.optional(v.array(v.object({
    multiplier: v.optional(v.number()),
    fabricId: v.optional(v.id('fabrics')),
    fabricVariantId: v.optional(v.id('fabricVariants')),
    materialId: v.optional(v.id('materials')),
    overwriteMaterialId: v.optional(v.union(v.id('materials'), v.id('fabrics'))),
  }))),
}

export const shiftReports = {
  income: v.number(),
  userId: v.id('users'),
  timeStamp: v.number(),
  allProductsQuantity: v.number(),
  products: v.array(v.object({
    color: v.optional(v.string()),
    comment: v.optional(v.string()),
    isSideWork: v.optional(v.boolean()),
    price: v.optional(v.union(v.number(), v.string())),
    specification: v.nullable(v.union(v.id('products'), v.string())),
    sizes: v.optional(v.array(v.object({ size: v.string(), quantity: v.union(v.number(), v.string()) }))),
  })),
};

export const fabricColors = {
  hex: v.string(),
  name: v.string(),
  labelHex: v.string(),
}

const fabricsTable = defineTable(fabricsSchema)
const fabricVariantsTable = defineTable(fabricVariantsSchema)
const fabricColorsTable = defineTable(fabricColors)
const proudctsTable = defineTable(productVariants);
const shiftReportsTabel = defineTable(shiftReports)
const materialsTable = defineTable(materialsSchema)
const specifications = defineTable(productsSpecification)
const icomingMaterialsTable = defineTable(storeMovementsSchema)

export {
  fabricsTable,
  fabricVariantsTable,
  fabricColorsTable,
  proudctsTable,
  shiftReportsTabel,
  materialsTable,
  specifications,
  icomingMaterialsTable,
}