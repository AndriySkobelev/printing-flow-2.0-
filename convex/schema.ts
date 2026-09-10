import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";
import type { Doc } from "../convex/_generated/dataModel";
import {
  productionOrdersTable,
  subcontractorTasksTable,
  productionOrderLogsTable,
  productionOrderItemsTable,
} from './schemas/orders';
import {
  cuttingTasksTable,
  cuttingTaskSizesTable,
  sewingTasksTable,
  sewingSubTasksTable,
  sewingLogsTable,
  brandingTasksTable,
  brandingLogsTable,
  packagingTasksTable,
  packagingLogsTable,
} from './schemas/prdouction';
import {
  fabricsTable,
  fabricVariantsTable,
  fabricColorsTable,
  materialsTable,
  materialVariantsTable,
  proudctsTable,
  specifications,
  icomingMaterialsTable,
  reservationsTable,
  stockBalancesTable,
} from './schemas/storage';


export const users = {
  name: v.optional(v.string()),
  lastName: v.optional(v.string()),
  image: v.optional(v.string()),
  email: v.optional(v.string()),
  emailVerificationTime: v.optional(v.number()),
  phone: v.optional(v.string()),
  phoneVerificationTime: v.optional(v.number()),
  isAnonymous: v.optional(v.boolean()),
  birthday: v.optional(v.string()),
  workHours: v.optional(v.number()),
  startDate: v.optional(v.string()),
  developingSpecification: v.optional(v.array(v.object({
    specificationId: v.id('specifications'),
    developingTime:  v.number(),
  }))),
  role: v.optional(v.union(
    v.literal('super_admin'),
    v.literal('admin'),
    v.literal('manager'),
    v.literal('seamstress'),
    v.literal('tailor'),
    v.literal('brander'),
  ))
}

export const orders = {
  orderId: v.optional(v.union(v.string(), v.number())),
  externalData: v.any(),
  products: v.optional(v.array(v.object({
    sku: v.string(),
    quantity: v.union(v.number(), v.string()),
    id: v.optional(v.union(v.string(), v.number())),
    comment: v.optional(v.union(v.string(), v.null())),
    shipment_type: v.optional(v.union(v.string(), v.null())),
    product_status_id: v.optional(v.union(v.string(), v.null())),
  }))),
}

// ─── МАППІНГ СТАТУСІВ З KEYCRM ──────────────────────────────────────────────
 
export const productStatusMappings = {
  keycrmStatusId: v.number(),
  label: v.string(),
  processingType: v.union(
    v.literal("branding"),
    v.literal("embroidery"),
    v.literal("silkscreen"),
    v.literal("none")
  ),
};

const productStatusMappingsTable = defineTable(productStatusMappings)
  .index("by_keycrmStatusId", ["keycrmStatusId"]);

const ordersTable = defineTable(orders)
const usersTable = defineTable(users)

export const plannerEventsSchema = {
  orderId: v.string(),
  orderNumber: v.string(),
  sewerId: v.string(),
  date: v.string(),       // yyyy-mm-dd
  startH: v.number(),
  startM: v.number(),
  duration: v.number(),   // minutes
}

const plannerEventsTable = defineTable(plannerEventsSchema)
  .index('by_date', ['date'])
  .index('by_sewer_date', ['sewerId', 'date'])

// Singleton row (there should only ever be one document in this table) holding
// system-wide toggles — see convex/queries/settings.ts.
export const systemSettingsSchema = {
  // When true, syncing an order from KeyCRM creates its production items even
  // for products whose SKU isn't set up yet in `products` (no productId/spec
  // to build cutting/sewing/branding tasks or reserve materials from — the
  // item is inserted with `isNew: true` and no productId).
  allowUnconfiguredProducts: v.boolean(),
}

const systemSettingsTable = defineTable(systemSettingsSchema)

export type Materials = Doc<'materials'>;
export type MaterialVariants = Doc<'materialVariants'>;
export type Users = Doc<'users'>;
export type Fabrics = Doc<'fabrics'>;
export type FabricVariants = Doc<'fabricVariants'>;
export type Orders = Doc<'orders'>;
export type Products = Doc<'products'>;
export type Specifications = Doc<'specifications'>;
export type StoreMovements = Doc<'storeMovements'>;

export default defineSchema({
  ...authTables,
  productStatusMappings: productStatusMappingsTable,
  productionOrders: productionOrdersTable,
  productionOrderItems: productionOrderItemsTable,
  cuttingTasks: cuttingTasksTable,
  cuttingTaskSizes: cuttingTaskSizesTable,
  sewingTasks: sewingTasksTable,
  sewingSubTasks: sewingSubTasksTable,
  sewingLogs: sewingLogsTable,
  brandingTasks: brandingTasksTable,
  fabricColors: fabricColorsTable
    .index('by_name', ['name']),
  brandingLogs: brandingLogsTable,
  packagingTasks: packagingTasksTable,
  packagingLogs: packagingLogsTable,
  subcontractorTasks: subcontractorTasksTable,
  productionOrderLogs: productionOrderLogsTable,
  users: usersTable.index("email", ["email"]),
  orders: ordersTable.index("orderId", ["orderId"]),
  fabrics: fabricsTable
    .index('by_name', ['name'])
    .searchIndex('search_name', {
      searchField: 'name',
    })
    .searchIndex('search_skuPrefix', {
      searchField: 'skuPrefix',
    }),
  fabricVariants: fabricVariantsTable
    .index('by_parentId', ['parentId']),
  materials: materialsTable
    .searchIndex('search_name', {
      searchField: 'name',
    })
    .index('by_skuPrefix', ['skuPrefix']),
  materialVariants: materialVariantsTable
    .index('by_parentId', ['parentId'])
    .searchIndex('search_text', {
      searchField: 'searchText',
    }),
  products: proudctsTable
    .index('search_sku', ['sku'])
    .index('by_parentId', ['parentId'])
    .searchIndex('search_text', {
      searchField: 'searchText'
    }),
  specifications: specifications
    .index('search_skuPrefix', ['skuPrefix']),
  storeMovements: icomingMaterialsTable
    .index('by_materialId', ['materialId']),
  plannerEvents: plannerEventsTable,
  reservations: reservationsTable
    .index('by_productionOrderItemId', ['productionOrderItemId'])
    .index('by_materialId', ['materialId'])
    .index('by_status', ['status']),
  stockBalances: stockBalancesTable
    .index('by_materialId', ['materialId']),
  systemSettings: systemSettingsTable,
});