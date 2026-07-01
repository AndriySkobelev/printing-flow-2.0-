import { query, mutation } from "../_generated/server";
import { getAll } from 'convex-helpers/server/relationships'
import { Fabrics, Materials } from "../schema";
import { productsSpecification } from "../schemas/storage";
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
          pickData = { name: (data as Fabrics)?.name }
        }
        if (material.materialId) {
          data = await ctx.db.get('materials', material.materialId)
          // pickData = pick(['name', 'color', 'size'], data as Materials || {})
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


export const checkSkuPrefix = query({
  args: { skuPrefix: v.string() },
  handler: async (ctx, { skuPrefix }) => {
    const existing = await ctx.db
      .query('specifications')
      .withIndex('search_skuPrefix', q => q.eq('skuPrefix', skuPrefix))
      .first();
    return { exists: existing !== null };
  },
})

export const insertSpecification = mutation({
  args: productsSpecification,
  handler: async (ctx, args) => {
    const materials = args.materials.map(m => ({ ...m, lineId: m.lineId ?? crypto.randomUUID() }));
    const data = await ctx.db.insert('specifications', { ...args, materials });
    return data;
  }
})

export const updateSpecification = mutation({
  args: { id: v.id('specifications'), data: v.optional(v.object(productsSpecification)) },
  handler: async (ctx, args) => {
    const { id, data } = args;
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
    const materials = spec.materials.map(m => ({ ...m, lineId: crypto.randomUUID() }));
    const updateData = { ...omit(['_id', '_creationTime'], spec), name: `${spec?.name} копія`, materials };
    const req = await ctx.db.insert('specifications', updateData)
    return { result: 'success'};
  }
})

export const getSpecificationById = query({
  args: { id: v.id('specifications') },
  handler: async (ctx, { id }) => {
    const spec = await ctx.db.get(id);
    if (!spec) return null;

    const materials = await Promise.all(spec.materials.map(async (material) => {
      let data: any = {};
      if (material.fabricId) {
        const fabric = await ctx.db.get(material.fabricId);
        data = { name: fabric?.name };
      }
      if (material.materialId) {
        const mat = await ctx.db.get(material.materialId);
        // data = { name: mat?.name, color: mat?.color, size: mat?.size };
      }
      return { ...material, ...data };
    }));

    return { ...spec, materials };
  }
})

export const generateSpecFileUploadUrl = mutation({
  handler: async (ctx) => ctx.storage.generateUploadUrl(),
})

export const addSpecAttachedFile = mutation({
  args: {
    specificationId: v.id('specifications'),
    storageId: v.string(),
    name: v.string(),
    contentType: v.optional(v.string()),
  },
  handler: async (ctx, { specificationId, storageId, name, contentType }) => {
    const spec = await ctx.db.get(specificationId);
    if (!spec) throw new Error('Специфікацію не знайдено');
    const url = await ctx.storage.getUrl(storageId as any);
    if (!url) throw new Error('Не вдалося отримати URL файлу');
    const files = [...(spec.attachedFiles ?? []), { url, name, contentType }];
    await ctx.db.patch(specificationId, { attachedFiles: files });
    return { url, name, contentType };
  },
})