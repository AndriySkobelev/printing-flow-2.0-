import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";
import type { Doc, Id } from "../convex/_generated/dataModel";

export enum TransactionType { INCOMING = 'incoming', OUTGOING = 'outgoing', RESERVE='reserve' }
export const TRANSACTION_TYPES = { INCOMING: 'incoming', OUTGOING: 'outgoing', RESERVE: 'reserve' } as const;

export const fabricsSchema = {
  sku: v.string(),
  color: v.string(),
  skuNumber: v.number(),
  skuPrefix: v.string(),
  id: v.optional(v.string()),
  name: v.optional(v.string()),
  updatedAt: v.optional(v.string()),
  createdAt: v.optional(v.string()),
  thredsSku: v.optional(v.string()),
  fabricName: v.optional(v.string()),
  units: v.union(v.literal('кг'), v.literal('м')),
  threds: v.optional(v.union(v.string(), v.number())),
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
  materials: v.array(v.object({
    units: v.string(),
    quantity: v.union(v.number(), v.string()),
    materialName: v.optional(v.string()),
    fabricId: v.optional(v.id('fabrics')),
    materialId: v.optional(v.id('materials')),
    type: v.optional(v.union(v.literal('fabric'), v.literal('material'), v.literal('base'))),
  })),
}

export const productVariants = {
  sku: v.string(),
  size: v.string(),
  color: v.string(),
  skuNumber: v.number(),
  style: v.optional(v.string()),
  parentId: v.id('specifications'),
  searchText: v.optional(v.string()),
  materials: v.optional(v.array(v.object({
    multiplier: v.optional(v.number()),
    fabricId: v.optional(v.id('fabrics')),
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

// ─── ВИРОБНИЧІ ЗАМОВЛЕННЯ ───────────────────────────────────────────────────
 
export const productionOrders = {
  keycrmOrderId: v.string(),
  keycrmManager: v.string(),
  startDate: v.number(),
  plannedShipDate: v.number(),
  status: v.union(
    v.literal("active"),
    v.literal("done"),
    v.literal("cancelled")
  ),
};

// ─── ТОВАРИ ЗАМОВЛЕННЯ ──────────────────────────────────────────────────────
 
export const productionOrderItems = {
  productionOrderId: v.id("productionOrders"),
  keycrmOrderId: v.string(),
  keycrmProductId: v.number(),
  name: v.string(),
  sku: v.string(),
  color: v.string(),
  size: v.string(),
  quantity: v.number(),
  shipmentType: v.union(
    v.literal("manufacturing"),
    v.literal("warehouse"),
    v.null()
  ),
  keycrmProductStatusId: v.union(v.number(), v.null()),
  processingType: v.optional(v.union(
    v.literal("branding"),
    v.literal("embroidery"),
    v.literal("silkscreen"),
    v.literal("none")
  )),
  needsCutting: v.optional(v.boolean()),
  needsSewing: v.optional(v.boolean()),
  needsBranding: v.optional(v.boolean()),
  needsSubcontractor: v.optional(v.boolean()),
  needsPackaging: v.optional(v.boolean()),
};

// ─── РОЗКРІЙ ────────────────────────────────────────────────────────────────
 
export const cuttingTasks = {
  productionOrderId: v.id("productionOrders"),
  keycrmOrderId: v.string(),
  specName: v.string(),
  fabric: v.string(),
  color: v.string(),
  startDate: v.optional(v.number()),
  endDate: v.optional(v.number()),
  status: v.union(
    v.literal("new"),
    v.literal("in_progress"),
    v.literal("done"),
    v.literal("delayed")
  ),
  assignedTo: v.optional(v.id("users")),
  note: v.optional(v.string()),
};

export const cuttingTaskSizes = {
  cuttingTaskId: v.id("cuttingTasks"),
  productionOrderItemId: v.id("productionOrderItems"),
  size: v.string(),
  quantity: v.number(),
  completedQty: v.number(),
  comment: v.optional(v.string()),
  logs: v.optional(v.array(v.object({
    quantity: v.number(),
    timestamp: v.number(),
    userId: v.id("users"),
    comment: v.optional(v.string()),
  }))),
};

// ─── ПОШИВ ──────────────────────────────────────────────────────────────────
 
export const sewingTasks = {
  productionOrderId: v.id("productionOrders"),
  keycrmOrderId: v.string(),
  specName: v.string(),
  totalQuantity: v.number(),
  startDate: v.number(),
  endDate: v.number(),
  status: v.union(
    v.literal("new"),
    v.literal("in_progress"),
    v.literal("done"),
    v.literal("delayed")
  ),
  note: v.optional(v.string()),
};

export const sewingSubTasks = {
  sewingTaskId: v.id("sewingTasks"),
  assignedTo: v.id("users"),
  quantity: v.number(),
  startDate: v.number(),
  endDate: v.number(),
  status: v.union(
    v.literal("new"),
    v.literal("in_progress"),
    v.literal("done"),
    v.literal("paused")
  ),
  note: v.optional(v.string()),
};

export const sewingLogs = {
  sewingSubTaskId: v.id("sewingSubTasks"),
  type: v.union(
    v.literal("completed"),
    v.literal("defect_fabric"),
    v.literal("defect_sewing")
  ),
  quantity: v.number(),
  timestamp: v.number(),
  note: v.optional(v.string()),
};
 
// ─── БРЕНДУВАННЯ ────────────────────────────────────────────────────────────
 
export const brandingTasks = {
  productionOrderId: v.id("productionOrders"),
  keycrmOrderId: v.string(),
  startDate: v.number(),
  endDate: v.number(),
  status: v.union(
    v.literal("new"),
    v.literal("in_progress"),
    v.literal("done"),
    v.literal("paused"),
    v.literal("waiting")
  ),
  note: v.optional(v.string()),
};
 
export const brandingLogs = {
  brandingTaskId: v.id("brandingTasks"),
  productionOrderItemId: v.id("productionOrderItems"),
  userId: v.id("users"),
  type: v.union(
    v.literal("completed"),
    v.literal("defect_fabric"),
    v.literal("defect_print")
  ),
  quantity: v.number(),
  timestamp: v.number(),
  comment: v.optional(v.string()),
};
 
// ─── ПАКУВАННЯ ──────────────────────────────────────────────────────────────
 
export const packagingTasks = {
  productionOrderId: v.id("productionOrders"),
  keycrmOrderId: v.string(),
  startDate: v.number(),
  endDate: v.number(),
  status: v.union(
    v.literal("new"),
    v.literal("in_progress"),
    v.literal("done"),
    v.literal("paused"),
    v.literal("waiting")
  ),
  note: v.optional(v.string()),
};

export const packagingLogs = {
  packagingTaskId: v.id("packagingTasks"),
  productionOrderItemId: v.id("productionOrderItems"),
  userId: v.id("users"),
  type: v.union(
    v.literal("completed"),
    v.literal("defect_fabric"),
    v.literal("defect_print"),
    v.literal("defect_sewing")
  ),
  quantity: v.number(),
  timestamp: v.number(),
  comment: v.optional(v.string()),
};
 
// ─── ПІДРЯДНИКИ ─────────────────────────────────────────────────────────────
 
export const subcontractors = {
  name: v.string(),
  type: v.union(
    v.literal("embroidery"),
    v.literal("silkscreen"),
    v.literal("other")
  ),
  leadTimeDays: v.number(),
};

export const subcontractorTasks = {
  productionOrderId: v.id("productionOrders"),
  keycrmOrderId: v.string(),
  subcontractorId: v.id("subcontractors"),
  type: v.union(
    v.literal("embroidery"),
    v.literal("silkscreen")
  ),
  quantity: v.number(),
  sentDate: v.number(),
  expectedReturnDate: v.number(),
  actualReturnDate: v.optional(v.number()),
  status: v.union(
    v.literal("sent"),
    v.literal("in_progress"),
    v.literal("returned"),
    v.literal("delayed")
  ),
  note: v.optional(v.string()),
};


const productStatusMappingsTable = defineTable(productStatusMappings)
  .index("by_keycrmStatusId", ["keycrmStatusId"]);
const productionOrdersTable = defineTable(productionOrders)
  .index("by_keycrmOrderId", ["keycrmOrderId"])
  .index("by_status", ["status"]);
const productionOrderItemsTable = defineTable(productionOrderItems)
  .index("by_productionOrder", ["productionOrderId"])
  .index("by_keycrmOrderId", ["keycrmOrderId"])
  .index("by_sku", ["sku"]);
const cuttingTasksTable = defineTable(cuttingTasks)
  .index("by_productionOrder", ["productionOrderId"])
  .index("by_status", ["status"])
  .index("by_assignedTo", ["assignedTo"]);
const cuttingTaskSizesTable = defineTable(cuttingTaskSizes)
  .index("by_cuttingTask", ["cuttingTaskId"])
  .index("by_productionOrderItem", ["productionOrderItemId"]);
const subcontractorTasksTable = defineTable(subcontractorTasks)
  .index("by_productionOrder", ["productionOrderId"])
  .index("by_subcontractor", ["subcontractorId"])
  .index("by_status", ["status"]);
const subcontractorsTable = defineTable(subcontractors);
const packagingLogsTable = defineTable(packagingLogs)
  .index("by_packagingTask", ["packagingTaskId"])
  .index("by_productionOrderItem", ["productionOrderItemId"])
  .index("by_type", ["type"]);
const packagingTasksTable = defineTable(packagingTasks)
  .index("by_productionOrder", ["productionOrderId"])
  .index("by_status", ["status"]);
const brandingLogsTable = defineTable(brandingLogs)
  .index("by_brandingTask", ["brandingTaskId"])
  .index("by_productionOrderItem", ["productionOrderItemId"])
  .index("by_type", ["type"]);
const brandingTasksTable = defineTable(brandingTasks)
  .index("by_productionOrder", ["productionOrderId"])
  .index("by_status", ["status"]);
const sewingLogsTable = defineTable(sewingLogs)
  .index("by_sewingSubTask", ["sewingSubTaskId"])
  .index("by_type", ["type"]);
const sewingSubTasksTable = defineTable(sewingSubTasks)
  .index("by_sewingTask", ["sewingTaskId"])
  .index("by_assignedTo", ["assignedTo"]);
const sewingTasksTable = defineTable(sewingTasks)
  .index("by_productionOrder", ["productionOrderId"])
  .index("by_status", ["status"]);


const fabricsTable = defineTable(fabricsSchema)
const usersTable = defineTable(users)
const ordersTable = defineTable(orders)
const proudctsTable = defineTable(productVariants);
const shiftReportsTabel = defineTable(shiftReports)
const materialsTable = defineTable(materialsSchema)
const specifications = defineTable(productsSpecification)
const icomingMaterialsTable = defineTable(storeMovementsSchema)

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
  brandingLogs: brandingLogsTable,
  packagingTasks: packagingTasksTable,
  packagingLogs: packagingLogsTable,
  subcontractors: subcontractorsTable,
  subcontractorTasks: subcontractorTasksTable,
  users: usersTable.index("email", ["email"]),
  orders: ordersTable.index("orderId", ["orderId"]),
  fabrics: fabricsTable
    .searchIndex('search_name', {
      searchField: 'fabricName',
    })
    .searchIndex('search_color', {
      searchField: 'color',
    })
    .searchIndex('search_skuPrefix', {
      searchField: 'skuPrefix',
    })
    .index('by_skuNumber', ['skuNumber']),
  materials: materialsTable
    .searchIndex('search_name', {
      searchField: 'searchText'
    }),
  products: proudctsTable
    .index('search_sku', ['sku'])
    .searchIndex('search_text', {
      searchField: 'searchText'
    }),
  specifications: specifications,
  shiftReports: shiftReportsTabel
    .index('by_timeStamp', ['timeStamp']),
  storeMovements: icomingMaterialsTable,
  plannerEvents: plannerEventsTable,
});