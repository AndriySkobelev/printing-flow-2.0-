import { query, mutation } from "../_generated/server";
import { getAll } from 'convex-helpers/server/relationships'
import { Fabrics, Materials, productsSpecification } from "../schema";
import { pick, omit } from "ramda";
import { v } from "convex/values";

const renameKey = (obj: any, oldKey: string, newKey: string) => {
  if (oldKey !== newKey && obj.hasOwnProperty(oldKey)) {
    obj[newKey] = obj[oldKey];
    delete obj[oldKey];
  }
  return obj;
}

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

        return {...data, ...material};
      }));

      return {
        ...spec,
        materials: mapData
      }
    }))
    return withMaterials;
  }
});

export const getSpecsWithMaterials = query({
  args: { specs: v.array(v.id('specifications')) },
  handler: async (ctx, args) => {
    const { specs } = args;
    const specifications = await getAll(ctx.db, specs);
    const withMaterials = await Promise.all(specifications.flatMap(async (spec) => {
      if (!spec) return null;
      const mapData = await Promise.all(spec.materials.map(async (material) => {
        let data, pickData;
        if (material.fabricId) {
          data = await ctx.db.get('fabrics', material.fabricId)
          pickData = renameKey(pick(['fabricName', 'color'], data as Fabrics || {}), 'fabricName', 'name')
        }
        if (material.materialId) {
          data = await ctx.db.get('materials', material.materialId)
          pickData = pick(['name', 'color', 'size'], data as Materials || {})
        }

        return {
          ...material,
          ...pickData
        };
      }));

      return {
        ...spec,
        materials: mapData
      }
    }))
    return withMaterials;
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
  args: { id: v.id('specifications'), data: v.optional(v.object(productsSpecification)) },
  handler: async (ctx, args) => {
    console.log('HERE')
    const { id, data } = args;
    console.log("🚀 ~ data:", data)
    const req = await ctx.db.patch(id, data || {})
    return req;
  }
})

export const deleteSpecification = mutation({
  args: { id: v.id('specifications') },
  handler: async (ctx, args) => {
    const { id } = args;
    const req = await ctx.db.delete(id)
    return { result: 'success'};
  }
})

export const duplicateSpecification = mutation({
  args: { id: v.id('specifications') },
  handler: async (ctx, args) => {
    const { id } = args;
    const spec = await ctx.db.get(id);
    if (!spec) return { result: 'error', message: 'Specification not found' };
    const updateData = {...omit(['_id', '_creationTime'], spec), name: `${spec?.name} копія`};
    const req = await ctx.db.insert('specifications', updateData)
    return { result: 'success'};
  }
})