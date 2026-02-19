import { query, mutation } from "../_generated/server";
import { fabricsSchema  } from "../schema";
import { v } from "convex/values";

export const getFabrics = query({
  args: {},
  handler: async (ctx) => {
    const materials = await ctx.db.query("fabrics").collect();
    return materials;
  }
})

export const createMaterial = mutation({
  args: fabricsSchema,
  handler: async (ctx, args) => {
    const materials = await ctx.db.insert("fabrics", args);
    return materials;
  }
})

export const getMaterialsByName = query({
  args: { fabricName: v.string() },
  handler: async (ctx, args) => {
    const materials = await ctx.db.query("fabrics").filter((q) => q.eq(q.field('fabricName'), args.fabricName)).collect();
    return materials;
  }
})

export const getMaterialsByColor = query({
  args: { color: v.string() },
  handler: async (ctx, args) => {
    const materials = await ctx.db.query("fabrics").filter((q) => q.eq(q.field('color'), args.color)).collect();
    return materials;
  }
})