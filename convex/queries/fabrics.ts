import { query, mutation } from "../_generated/server";
import { fabricsSchema  } from "../schema";
import { v } from "convex/values";

///////// QUERY //////////
export const getFabrics = query({
  args: {},
  handler: async (ctx) => {
    const materials = await ctx.db.query("fabrics").collect();
    return materials;
  }
})

export const getFabricsOptions = query({
  args: { inputValue: v.string() },
  handler: async (ctx, args) => {
    const materials = await ctx.db
    .query("fabrics")
    .withSearchIndex('search_name', q => q.search('fabricName', args.inputValue))
    .take(20);
    return materials;
  }
})

export const getFabricsOptionsByColor = query({
  args: { inputValue: v.string() },
  handler: async (ctx, args) => {
    const materials = await ctx.db
    .query("fabrics")
    .withSearchIndex('search_color', q => q.search('color', args.inputValue))
    .take(20);
    return materials;
  }
})

export const getFabricsByName = query({
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

export const getFabricById = query({
  args: { id: v.id('fabrics') },
  handler: async (ctx, args) => {
    const { id } = args;
    const fabric = await ctx.db.get(id)
    if (!fabric) {
      throw new Error(`Fabric with id ${id} not found`);
    }
    return fabric;
  }
})

///////// QUERY //////////

///////// MUTATIONS //////////
export const createMaterial = mutation({
  args: fabricsSchema,
  handler: async (ctx, args) => {
    const materials = await ctx.db.insert("fabrics", args);
    return materials;
  }
})
///////// MUTATIONS //////////
