import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import type { Doc, Id } from "../convex/_generated/dataModel";

export enum TransactionType { INCOMING = 'incoming', OUTGOING = 'outgoing', RESERVE='reserve' }
export const TRANSACTION_TYPES = { INCOMING: 'incoming', OUTGOING: 'outgoing', RESERVE: 'reserve' } as const;

export const fabricsSchema = {
  id: v.string(),
  sku: v.string(),
  color: v.string(),
  skuNumber: v.number(),
  thredsSku: v.string(),
  createdAt: v.string(),
  updatedAt: v.string(),
  skuPrefix: v.string(),
  fabricName: v.string(),
  units: v.literal('кг'),
  threds: v.union(v.string(), v.number()),
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
  units: v.string(),
  quantity: v.number(),
  fabricId: v.optional(v.id('fabrics')),
  materialId: v.optional(v.id('materials')),
  type: v.union(
    v.literal(TRANSACTION_TYPES['INCOMING']),
    v.literal(TRANSACTION_TYPES['OUTGOING']),
    v.literal(TRANSACTION_TYPES['RESERVE'])
  ),
  //// OPTIONAL FIELDS
  orderId: v.optional(v.number()),
  manager: v.optional(v.string()),
  description: v.optional(v.string()),
  productQuantity: v.optional(v.number()),
  orderShippingDate: v.optional(v.string()),
  productInfo: v.optional(v.array(v.string())),
}

export const productsSpecification = {
  name: v.string(),
  category: v.string(),
  skuPrefix: v.string(),
  materials: v.array(v.object({
    units: v.string(),
    quantity: v.number(),
    fabricId: v.optional(v.id('fabrics')),
    materialId: v.optional(v.id('materials')),
  })),
}

export const productVariants = {
  sku: v.string(),
  size: v.string(),
  color: v.string(),
  skuNumber: v.number(),
  style: v.optional(v.string()),
  parentId: v.id('specifications'),
  materials: v.optional(v.array(v.object({
    multiplier: v.optional(v.number()),
    fabricId: v.optional(v.id('fabrics')),
    materialId: v.optional(v.id('materials')),
    overwriteMaterialId: v.optional(v.id('materials')),
  }))),
}

const fabricsTable = defineTable(fabricsSchema)
const proudctsTable = defineTable(productVariants);
const materialsTable = defineTable(materialsSchema)
const specifications = defineTable(productsSpecification)
const icomingMaterialsTable = defineTable(storeMovementsSchema)

export type Materials = Doc<'materials'>;
export type Fabrics = Doc<'fabrics'>;
export type Products = Doc<'products'>;
export type Specifications = Doc<'specifications'>;
export type StoreMovements = Doc<'storeMovements'>;

export default defineSchema({
  fabrics: fabricsTable
    .searchIndex('search_name', {
      searchField: 'fabricName'
    })
    .index('by_skuNumber', ['skuNumber']),
  materials: materialsTable
  .searchIndex('search_name', {
    searchField: 'searchText'
  }),
  products: proudctsTable
  .index('search_sku', ['sku']),
  specifications: specifications,
  storeMovements: icomingMaterialsTable,
});