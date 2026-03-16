import { getAll } from "convex-helpers/server/relationships";
import { query, mutation } from "../_generated/server";
import { materialsSchema } from "../schema";
import { v } from "convex/values";

///////// QUERY //////////
export const getMaterials = query({
  args: {},
  handler: async (ctx) => {
    const materials = await ctx.db.query("materials").collect();
    return materials;
  }
})

export const createMaterial = mutation({
  args: materialsSchema,
  handler: async (ctx, args) => {
    const materials = await ctx.db.insert("materials", args);
    return materials;
  }
})

export const getMaterialsByFilter = query({
  args: { fabricName: v.string() },
  handler: async (ctx, args) => {
    const materials = await ctx.db.query("fabrics").filter((q) => q.eq(q.field('fabricName'), args.fabricName)).collect();
    return materials;
  }
})

export const getMaterialOptions = query({
  args: { inputValue: v.string() },
  handler: async (ctx, args) => {
    const materials = await ctx.db
    .query("materials")
    .withSearchIndex('search_name', q => q.search('searchText', args.inputValue))
    .take(20);
    return materials;
  }
})

export const getMaterialById = query({
  args: { id: v.id('materials') },
  handler: async (ctx, args) => {
    const { id } = args;
    const material = await ctx.db
    .get(id)
    if (!material) {
      throw new Error(`Material with id ${id} not found`);
    }
    return material;
  }
})

export const getMaterialByIds = query({
  args: { ids: v.array(v.id('materials')) },
  handler: async (ctx, args) => {
    const { ids } = args;
    const materials = await getAll(ctx.db, ids);
    if (!materials) {
      throw new Error(`Materials with id ${ids.join(', ')} not found`);
    }
    return materials;
  }
})
///////// QUERY //////////

///////// MUTATIONS //////////
export const addSearchText = mutation({
  handler: async (ctx) => {
    const materials = await ctx.db
      .query('materials')
      .collect();
    await Promise.all(materials.map(async (material) => {
      await ctx.db.patch(material._id, { searchText: `${material.name}.${material.color}`})
    }))
  }
});

export const createAllMaterials = mutation({
  args: { materials : v.array(v.object(materialsSchema)) },
  handler: async (ctx, args) => {
    await Promise.all(args.materials.map(async (material) => {
      await ctx.db.insert('materials', material);
    }))

    return null;
  }
})

export const makeMigrateData = mutation({
  args: {},
  handler: async (ctx) => {
    const fabrics = await ctx.db.query('fabrics').collect();
    for (const fabric of fabrics) { await ctx.db.patch(fabric._id, { units: "кг" }); }

    return null;
  }
})
///////// MUTATIONS //////////