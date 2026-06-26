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
  proudctsTable,
  specifications,
  shiftReportsTabel,
  icomingMaterialsTable
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

export type Materials = Doc<'materials'>;
export type Users = Doc<'users'>;
export type ShiftReportsType = Doc<'shiftReports'>;
export type Fabrics = Doc<'fabrics'>;
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
  fabricColors: fabricColorsTable,
  brandingLogs: brandingLogsTable,
  packagingTasks: packagingTasksTable,
  packagingLogs: packagingLogsTable,
  subcontractorTasks: subcontractorTasksTable,
  productionOrderLogs: productionOrderLogsTable,
  users: usersTable.index("email", ["email"]),
  orders: ordersTable.index("orderId", ["orderId"]),
  fabrics: fabricsTable
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
      searchField: 'searchText'
    }),
  products: proudctsTable
    .index('search_sku', ['sku'])
    .index('by_parentId', ['parentId'])
    .searchIndex('search_text', {
      searchField: 'searchText'
    }),
  specifications: specifications
    .index('search_skuPrefix', ['skuPrefix']),
  shiftReports: shiftReportsTabel
    .index('by_timeStamp', ['timeStamp']),
  storeMovements: icomingMaterialsTable,
  plannerEvents: plannerEventsTable,
});