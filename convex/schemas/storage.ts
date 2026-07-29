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
  skuPrefix: v.string(),
  units: v.string(),
  category: v.string(),
  material: v.optional(v.string()),
  sizes: v.optional(v.array(v.string())),
  colors: v.optional(v.array(v.string())),
  lastVariantIndex: v.optional(v.number()),
};

export const materialVariantsSchema = {
  sku: v.string(),
  color: v.string(),
  size: v.string(),
  skuNumber: v.number(),
  code: v.optional(v.string()),
  parentId: v.id('materials'),
  searchText: v.optional(v.string()),
};

export const storeMovementsSchema = {
  quantity: v.number(),
  materialType: v.union(
    v.literal('fabricVariants'),
    v.literal('materialVariants'),
  ),
  materialId: v.union(v.id('materialVariants'), v.id('fabricVariants')),
  type: v.union(
    v.literal(TRANSACTION_TYPES['INCOMING']),
    v.literal(TRANSACTION_TYPES['OUTGOING']),
  ),
  //// OPTIONAL FIELDS
  orderId: v.optional(v.number()),
  manager: v.optional(v.string()),
  description: v.optional(v.string()),
  orderShippingDate: v.optional(v.string()),
  productInfo: v.optional(v.array(v.string())),
  productQuantity: v.optional(v.number()),
  balanceAfter: v.optional(v.number()),
  userId: v.id('users'),
}

export const reservations = {
  userId: v.id('users'),
  quantity: v.number(),
  materialType: v.union(
    v.literal('fabricVariants'),
    v.literal('materialVariants'),
  ),
  manager: v.optional(v.string()),
  fulfilledQty: v.optional(v.number()),
  orderShippingDate: v.optional(v.string()),
  productInfo: v.optional(v.array(v.string())),
  productionOrderItemId: v.id('productionOrderItems'),
  materialId: v.union(v.id('materialVariants'), v.id('fabricVariants')),
  status: v.union(v.literal('active'), v.literal('released'), v.literal('fulfilled')),
}

export const stockBalances = {
  userId: v.id('users'),
  materialType: v.union(
    v.literal('fabricVariants'),
    v.literal('materialVariants'),
  ),
  materialId: v.union(v.id('materialVariants'), v.id('fabricVariants')),
  inStock: v.number(),
  reserved: v.number(),
  updateAt: v.number(),
}

export const productsSpecification = {
  name: v.string(),
  category: v.string(),
  // KeyCRM's own category, picked from /products/categories — kept separate
  // from `category` (our free-text local grouping) so migrateSpecificationToKeyCrm
  // can send category_id without guessing a mapping between the two.
  category_name: v.optional(v.string()),
  category_crm_id: v.optional(v.number()),
  migrated: v.optional(v.boolean()),
  // The KeyCRM parent product created for this spec's variants (offers) — once
  // set, migrating again reuses it instead of creating a duplicate product.
  keycrm_product_id: v.optional(v.number()),
  skuPrefix: v.string(),
  productionPrice: v.optional(v.union(v.number(), v.string())),
  productionTime:  v.optional(v.union(v.number(), v.string())),
  cutTime:         v.optional(v.union(v.number(), v.string())),
  packingTime:     v.optional(v.union(v.number(), v.string())),
  brandingTime:    v.optional(v.union(v.number(), v.string())),
  customSizes: v.optional(v.array(v.string())),
  materials: v.array(v.object({
    units: v.string(),
    name: v.optional(v.string()),
    lineId: v.optional(v.string()),
    quantity: v.union(v.number(), v.string()),
    id: v.union(v.id('materials'), v.id('fabrics')),
    type: v.optional(v.union(v.literal('fabric'), v.literal('material'))),
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
  migrated: v.optional(v.boolean()),
  processingType: v.optional(v.union(v.string(), v.null())),
  materials: v.optional(v.array(v.object({
    lineId: v.optional(v.string()),
    multiplier: v.optional(v.number()),
    id: v.union(v.id('materialVariants'), v.id('fabricVariants')),
    type: v.optional(v.union(v.literal('fabric'), v.literal('material'))),
  }))),
}

export const fabricColors = {
  hex: v.string(),
  name: v.string(),
  labelHex: v.string(),
}

const fabricsTable = defineTable(fabricsSchema)
const fabricVariantsTable = defineTable(fabricVariantsSchema)
const fabricColorsTable = defineTable(fabricColors)
const proudctsTable = defineTable(productVariants);
const materialsTable = defineTable(materialsSchema)
const materialVariantsTable = defineTable(materialVariantsSchema)
const specifications = defineTable(productsSpecification)
const icomingMaterialsTable = defineTable(storeMovementsSchema)
const reservationsTable = defineTable(reservations)
const stockBalancesTable = defineTable(stockBalances)

export {
  fabricsTable,
  fabricVariantsTable,
  fabricColorsTable,
  proudctsTable,
  materialsTable,
  materialVariantsTable,
  specifications,
  icomingMaterialsTable,
  reservationsTable,
  stockBalancesTable,
}