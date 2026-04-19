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

const fabricsTable = defineTable(fabricsSchema)
const usersTable = defineTable(users)
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
export type Products = Doc<'products'>;
export type Specifications = Doc<'specifications'>;
export type StoreMovements = Doc<'storeMovements'>;

export default defineSchema({
  ...authTables,
  users: usersTable.index("email", ["email"]),
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