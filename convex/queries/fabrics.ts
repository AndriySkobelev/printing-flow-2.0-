import { query, mutation } from "../_generated/server";
import { pick, prop } from 'ramda';
import { fabricsSchema } from "../schema";
import { v } from "convex/values";

///////// QUERY //////////
export const getFabrics = query({
  args: {},
  handler: async (ctx) => {
    const materials = await ctx.db.query("fabrics").collect();
    if (!materials) return []; 
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
export const createFabrics = mutation({
  args: {
    name: v.string(),
    skuPrefix: v.string(),
    colors: v.array(v.string()),
    units: fabricsSchema['units']
  },
  handler: async (ctx, args) => {
    const { name, units, skuPrefix, colors } = args;
    if (!colors) throw new Error("Colors are required");

    await Promise.all(colors?.map(async (color, i) => {
      await ctx.db.insert("fabrics", {
        fabricName: name,
        units,
        skuPrefix,
        color,
        skuNumber: i + 1,
        sku: `${skuPrefix}-${String(i+1).padStart(3, '0')}`,
      })
    }))
  }
})
///////// MUTATIONS //////////

export const migrateFabricsAddName = mutation({
  handler: async (ctx) => {
    const fabrics = await ctx.db.query("fabrics").collect();
    await Promise.all(fabrics.map(async (fabric) => {
      if (fabric.fabricName) {
        await ctx.db.patch(fabric._id, { name: fabric.fabricName });
      }
    }));
    return { updated: fabrics.filter(f => f.fabricName).length };
  }
})
