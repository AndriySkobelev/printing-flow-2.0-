import { v } from "convex/values";
import { defineTable } from "convex/server";

export const productionOrders = {
  startDate: v.number(),
  keycrmOrderId: v.string(),
  keycrmManager: v.string(),
  plannedShipDate: v.number(),
  keycrmData: v.optional(v.any()),
  status: v.union(
    v.literal("in_progress"),
    v.literal("active"),
    v.literal("dispatched"),
    v.literal("done"),
    v.literal("cancelled")
  ),
};

export const productionOrderLogs = {
  productionOrderId: v.id("productionOrders"),
  keyCrmOrderId: v.string(),
  productionOrderItemId: v.optional(v.id("productionOrderItems")),
  timestamp: v.number(),
  userId: v.id("users"),
  type: v.union(
    v.literal('split'),
    v.literal("created"),
    v.literal("deleted"),
    v.literal("updated")
  ),
  changes: v.optional(v.any()),
  comment: v.optional(v.string()),
  newQuantity: v.optional(v.number()),
  oldQuantity: v.optional(v.number()),
  shownToUserId: v.optional(v.id("users")),
}

// ─── ТОВАРИ ЗАМОВЛЕННЯ ──────────────────────────────────────────────────────
 
export const productionOrderItems = {
  productionOrderId: v.id("productionOrders"),
  keycrmOrderId: v.optional(v.string()),
  keycrmProductId: v.optional(v.number()),
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
  keycrmProductComment: v.optional(v.union(v.string(), v.null())),
  comment: v.optional(v.string()),
  sewingComment: v.optional(v.nullable(v.string())),
  cuttingComment: v.optional(v.nullable(v.string())),
  brandingComment: v.optional(v.nullable(v.string())),
  packagingComment: v.optional(v.nullable(v.string())),
  materialProcessingType: v.optional(v.union(v.string(), v.null())),
  processingType: v.optional(v.union(
    v.literal("branding"),
    v.literal("embroidery"),
    v.literal("silkscreen"),
    v.literal("none")
  )),
  needsCutting: v.optional(v.boolean()),
  needsSewing: v.optional(v.boolean()),
  needsBranding: v.optional(v.boolean()),
  destination: v.optional(v.nullable(v.union(v.literal("customer"), v.literal("warehouse"), v.literal('defects')))),
  needsSubcontractor: v.optional(v.boolean()),
  needsPackaging: v.optional(v.boolean()),
  brandingType: v.optional(v.nullable(v.array(v.union(
    v.literal('dtf'),
    v.literal('dtg'),
    v.literal('flok'),
    v.literal('embroidery'),
    v.literal('sublimation'),
  )))),
  cuttingBrandingType: v.optional(v.nullable(v.array(v.union(
    v.literal('dtf'),
    v.literal('dtg'),
    v.literal('flok'),
    v.literal('embroidery'),
    v.literal('sublimation'),
  )))),
};

const productionOrdersTable = defineTable(productionOrders)
  .index("by_keycrmOrderId", ["keycrmOrderId"])
  .index("by_status", ["status"]);
const productionOrderItemsTable = defineTable(productionOrderItems)
  .index("by_productionOrder", ["productionOrderId"])
  .index("by_keycrmOrderId", ["keycrmOrderId"])
  .index("by_sku", ["sku"]);
const productionOrderLogsTable = defineTable(productionOrderLogs)
  .index("by_productionOrder", ["productionOrderId"])
  .index("by_productionOrderItem", ["productionOrderItemId"]);

export {
  productionOrdersTable,
  productionOrderItemsTable,
  productionOrderLogsTable,
}