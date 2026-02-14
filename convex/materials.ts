import { query, mutation } from "./_generated/server";
import { omit } from 'ramda'
import { storeMovementsSchema } from "./schema";
import { v } from "convex/values";

export const getMaterials = query({
  args: {},
  handler: async (ctx) => {
    const materials = await ctx.db.query("materials").collect();
    return materials;
  }
})

export const getMaterialsByFilter = query({
  args: { fabricName: v.string() },
  handler: async (ctx, args) => {
    const materials = await ctx.db.query("materials").filter((q) => q.eq(q.field('fabricName'), args.fabricName)).collect();
    return materials;
  }
})

export const createIncoming = mutation({
  args: storeMovementsSchema,
  handler: async (ctx, args) => {
    const materials = await ctx.db.insert("storeMovements", args);
    return materials;
  }
})

export const getMovements = query({
  args: {},
  handler: async (ctx) => {
    const movments = await ctx.db.query('storeMovements').collect();
    return movments;
  }
})

export const makeMigrateData = mutation({
  args: {},
  handler: async (ctx) => {
    const getMaterials = await ctx.db.query('fabrics').collect();
    await Promise.all(getMaterials.map(async (fabric) => {
      await ctx.db.insert('fabrics', omit(['_id', '_creationTime'], fabric));
    }))

    return null;
  }
})