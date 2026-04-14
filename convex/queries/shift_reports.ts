import { query, mutation, QueryCtx } from '../_generated/server';
import { Id } from "../_generated/dataModel";
import { v } from 'convex/values';
import { startOfMonth, endOfMonth, format } from 'date-fns'
import { pick, omit, uniq, indexBy, prop, map } from 'ramda'
import { ShiftReportsType, Specifications, shiftReports } from '../schema';
import { getAll } from 'convex-helpers/server/relationships';


type PickDataType = keyof Specifications

type ProductsType = {
  specification: Id<"specifications">;
  quantity?: number;
  price?: number,
  comment?: string;
}

const cobineProducts = async (ctx: QueryCtx, {
  products,
}:{
  products: ProductsType[],
}) => {
  const cobined = await Promise.all(products.map(async (product) => {
    const spec = await ctx.db.get(product?.specification);
    if (spec === null) return null
    return {
      ...product,
      specification: {
        label: spec?.name,
        value: product.specification,
        price: spec?.productionPrice,
      }
    }
  }))
  const filterByNull = cobined.filter(el => el !== null);
  return filterByNull;
}

const getProductWithParenet = async (ctx: QueryCtx, id: Id<'products'>) => {
  const product = await ctx.db.get(id);
  if (product === null) throw Error('Product not forund')
  const spec = await ctx.db.get(product?.parentId);
  if (spec === null) throw Error('Specification not forund')
  
  return {
    productData: product,
    specData: spec
  }
}

// Create a new shift report
export const createShiftReport = mutation({
  args: shiftReports,
  handler: async ({ db }, args) => {
    const id = await db.insert('shiftReports', args);
    return { id };
  },
})

// Update an existing shift report
export const updateShiftReport = mutation({
  args: {
    id: v.id('shiftReports'),
    updates: v.object({
      title: v.optional(v.string()),
      description: v.optional(v.string()),
    }),
  },
  handler: async ({ db }, { id, updates }) => {
    await db.patch('shiftReports', id, {})
    return { success: true };
  },
});


// Delete a shift report
export const deleteShiftReport = mutation({
  args: {
    id: v.id('shiftReports'),
  },
  handler: async ({ db }, { id }) => {
    await db.delete('shiftReports', id);
    return { success: true };
  },
});

// Query to fetch all shift reports
export const getShiftReports = query({
  args: {},
  handler: async ({ db }) => {
    return await db.query('shiftReports').collect();
  },
});

export const getShiftReportsByUser = query({
  args: {
    userId: v.id('users'),
    endMonth: v.number(),
    startMonth: v.number(),
  },
  handler: async (ctx, args) => {
    const { userId, endMonth, startMonth } = args
    if (!userId) return null;
    const reports = await ctx.db.query('shiftReports')
      .withIndex('by_timeStamp', (q) => q
        .gte("timeStamp", startMonth)
        .lte("timeStamp", endMonth),
      )
      .filter(q => q.eq(q.field('userId'), userId))
      .collect();
    const readyProducts = await Promise.all(reports.map(async (report) => {
      const filterSpecifications = report.products.filter(product => !product.isSideWork) as any;
      const filterSideWork = report.products.filter(product => product?.isSideWork);
      const productWithParent = await cobineProducts(ctx, { products: filterSpecifications })
      return {
        ...report,
        products: [
          ...productWithParent,
          ...filterSideWork
        ]
      }
    }))
    
    return readyProducts;
  },
});

export const getShiftReportsMonthIncome = query({
  args: {
    userId: v.id('users'),
    endMonth: v.number(),
    startMonth: v.number(),
    prevEndMonth: v.number(),
    prevStartMonth: v.number(),
  },
  handler: async (ctx, args) => {
    const { userId, endMonth, startMonth, prevEndMonth, prevStartMonth } = args
    if (!userId) return null;
    const [currReports, prevReports] = await Promise.all([
        ctx.db.query('shiftReports')
        .withIndex('by_timeStamp', (q) => q
          .gte("timeStamp", startMonth)
          .lte("timeStamp", endMonth),
        )
        .filter(q => q.eq(q.field('userId'), userId))
        .collect(),
        ctx.db.query('shiftReports')
        .withIndex('by_timeStamp', (q) => q
          .gte("timeStamp", prevStartMonth)
          .lte("timeStamp", prevEndMonth),
        )
        .filter(q => q.eq(q.field('userId'), userId))
        .collect(),
    ])
    
    return {
      currIncome: currReports.reduce((prev, curr) => prev + curr.income, 0),
      prevIncome: prevReports.reduce((prev, curr) => prev + curr.income, 0),
    };
  },
});
