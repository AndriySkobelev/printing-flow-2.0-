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
};

export const storeMovementsSchema = {
  sku: v.string(),
  name: v.string(),
  color: v.string(),
  units: v.string(),
  quantity: v.number(),
  tableName: v.union(v.literal('fabrics'), v.literal('materials')),
  materialId: v.string(),
  type: v.union(
    v.literal(TRANSACTION_TYPES['INCOMING']),
    v.literal(TRANSACTION_TYPES['OUTGOING']),
    v.literal(TRANSACTION_TYPES['RESERVE'])
  ),
  //// OPTIONAL FIELDS
  orderId: v.optional(v.string()),
  manager: v.optional(v.string()),
  description: v.optional(v.string()),
  productSku: v.optional(v.string()), //
  productName: v.optional(v.string()), // Футболка легка
  productSize: v.optional(v.string()), // S, M, L,
  productQuantity: v.optional(v.number()),
  orderShippingDate: v.optional(v.string()),
}

export const productsSpecification = {
  sku: v.string(),
  name: v.string(),
  category: v.string(),
  materials: v.array(v.object({
    materialId: v.id('materials'),
    quantity: v.number(),
    units: v.string(),
  })),
}

export const productVariants = {
  sku: v.string(),
  productId: v.id('products'),
  size: v.string(),
  color: v.string(),
  style: v.string(),
  materials: v.array(v.object({
    materialId: v.id('materials'),
    overwriteMaterialId: v.optional(v.id('materials')),
    multiplier: v.number(),
  })),
}

const fabricsTable = defineTable(fabricsSchema)
const materialsTable = defineTable(materialsSchema)
const icomingMaterialsTable = defineTable(storeMovementsSchema)

export type Materials = Doc<'materials'>;
export type Fabrics = Doc<'fabrics'>;
export type StoreMovements = Doc<'storeMovements'>;

export default defineSchema({
  fabrics: fabricsTable,
  materials: materialsTable,
  storeMovements: icomingMaterialsTable,
});