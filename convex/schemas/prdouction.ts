import { v } from "convex/values";
import { defineTable } from "convex/server";
import { taskStatusV, extendedTaskStatusV, destinationTypeV } from './constants'

export const cuttingTasks = {
  color: v.string(),
  fabric: v.string(),
  specName: v.string(),
  keycrmOrderId: v.string(),
  endDate: v.optional(v.number()),
  startDate: v.optional(v.number()),
  orderIndex: v.optional(v.string()),
  planedEndDate: v.optional(v.number()),
  productionOrderId: v.id("productionOrders"),
  status: extendedTaskStatusV,
  assignedTo: v.optional(v.id("users")),
  note: v.optional(v.string()),
  isCustomCut: v.optional(v.boolean()),
  customCutComment: v.optional(v.string()),
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
  cuttingTaskId: v.optional(v.id("cuttingTasks")),
  keycrmOrderId: v.string(),
  orderIndex: v.optional(v.string()),
  specName: v.string(),
  color: v.optional(v.string()),
  totalQuantity: v.number(),
  startDate: v.number(),
  endDate: v.number(),
  status: taskStatusV,
  note: v.optional(v.string()),
};

export const sewingSubTasks = {
  sewingTaskId: v.id("sewingTasks"),
  productionOrderItemId: v.optional(v.id("productionOrderItems")),
  assignedTo: v.optional(v.id("users")),
  size: v.optional(v.string()),
  quantity: v.number(),
  completedQty: v.optional(v.number()),
  startDate: v.optional(v.number()),
  endDate: v.optional(v.number()),
  duration: v.optional(v.union(v.number(), v.string())),
  destination: v.optional(destinationTypeV),
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
  endDate: v.number(),
  startDate: v.number(),
  keycrmOrderId: v.string(),
  note: v.optional(v.string()),
  manager: v.optional(v.string()),
  shippedDate: v.optional(v.number()),
  identifierName: v.optional(v.string()),
  productionOrderId: v.id("productionOrders"),
  status: extendedTaskStatusV,
  tags: v.optional(v.array(v.object({ name: v.string(), color: v.string() }))),
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
  status: extendedTaskStatusV,
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

const cuttingTasksTable = defineTable(cuttingTasks)
  .index("by_productionOrder", ["productionOrderId"])
  .index("by_status", ["status"])
  .index("by_assignedTo", ["assignedTo"]);
const cuttingTaskSizesTable = defineTable(cuttingTaskSizes)
  .index("by_cuttingTask", ["cuttingTaskId"])
  .index("by_productionOrderItem", ["productionOrderItemId"]);
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
  .index("by_assignedTo", ["assignedTo"])
  .index("by_productionOrderItem", ["productionOrderItemId"]);
const sewingTasksTable = defineTable(sewingTasks)
  .index("by_productionOrder", ["productionOrderId"])
  .index("by_cuttingTask", ["cuttingTaskId"])
  .index("by_status", ["status"]);

export {
  sewingLogsTable,
  sewingTasksTable,
  brandingLogsTable,
  cuttingTasksTable,
  brandingTasksTable,
  packagingLogsTable,
  sewingSubTasksTable,
  packagingTasksTable,
  cuttingTaskSizesTable,
}