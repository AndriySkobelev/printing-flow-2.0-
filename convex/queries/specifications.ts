import { query, mutation } from "../_generated/server";
import { getAll } from 'convex-helpers/server/relationships'
import { productsSpecification } from "../schema";
import { v } from "convex/values";

export const getSpecifications = query({
  handler: async (ctx) => {
    const specifications = await ctx.db.query('specifications').collect();
    return specifications;
  }
})

export const getSpecificationsWithMaterials = query({
  handler: async (ctx) => {
    const specifications = await ctx.db.query('specifications').collect();
    const withMaterials = await Promise.all(specifications.flatMap(async (spec) => {
      const mapData = await Promise.all(spec.materials.map(async (material) => {
        let data;
        if (material.fabricId) {
          data = await ctx.db.get('fabrics', material.fabricId)
        }
        if (material.materialId) {
          data = await ctx.db.get('materials', material.materialId)
        }

        return data;
      }));

      return {
        ...spec,
        materials: mapData
      }
    }))
    return withMaterials;
  }
});

export const getAllSpecifications = query({
  args: { specs: v.array(v.id('specifications')) },
  handler: async (ctx, args) => {
    const { specs } = args;
    const specifications = await getAll(ctx.db, specs);
    return specifications;
  }
})

export const insertSpecification = mutation({
  args: productsSpecification,
  handler: async (ctx, args) => {
    const data = await ctx.db.insert('specifications', args)
    return data;
  }
})

export const updateSpecification = mutation({
  args: { _id: v.id('specifications'), data: v.optional(v.object(productsSpecification)) },
  handler: async (ctx, args) => {
    const { _id, data } = args;
    const req = await ctx.db.patch(_id, data || {})
    return req;
  }
})

export const deleteSpecification = mutation({
  args: { _id: v.id('specifications') },
  handler: async (ctx, args) => {
    const { _id } = args;
    const req = await ctx.db.delete(_id)
    return { result: 'success'};
  }
})