import { v } from "convex/values";
import { query, mutation } from "../_generated/server";
import { suppliersSchema } from "../schemas/storage";

export const getSuppliers = query({
  handler: async (ctx) => ctx.db.query("suppliers").withIndex("by_name").collect(),
})

export const createSupplier = mutation({
  args: suppliersSchema,
  handler: async (ctx, args) => ctx.db.insert("suppliers", args),
})

export const updateSupplier = mutation({
  args: { id: v.id("suppliers"), ...suppliersSchema },
  handler: async (ctx, { id, ...data }) => ctx.db.patch(id, data),
})

export const deleteSupplier = mutation({
  args: { id: v.id("suppliers") },
  handler: async (ctx, { id }) => {
    const fabrics = await ctx.db
      .query("fabrics")
      .withIndex("by_supplierId", q => q.eq("supplierId", id))
      .collect();
    await Promise.all(fabrics.map(fabric => ctx.db.patch(fabric._id, { supplierId: null })));
    await ctx.db.delete(id);
  },
})
