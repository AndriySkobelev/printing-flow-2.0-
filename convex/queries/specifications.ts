import { query, mutation } from "../_generated/server";
import type { QueryCtx } from "../_generated/server";
import { getAll } from 'convex-helpers/server/relationships'
import { productsSpecification } from "../schemas/storage";
import { omit } from "ramda";
import { v } from "convex/values";

// Spec material lines reference the generic parent fabric/material (no color)
// via { id, type }. This resolves that parent doc for display (name).
export const resolveMaterialParent = async <T extends { id: any, type?: 'fabric' | 'material', name?: string }>(
  ctx: QueryCtx,
  material: T
): Promise<T & { name?: string }> => {
  const parent = material.type === 'material'
    ? await ctx.db.get('materials', material.id)
    : await ctx.db.get('fabrics', material.id);
  return { ...material, name: parent?.name ?? material.name };
}

// Product-level material overrides reference a specific fabricVariant/materialVariant
// (a color/size) via { id, type }. This resolves that variant plus its parent doc
// for display (name, color, size, sku).
export const resolveMaterialVariant = async <T extends { id: any, type?: 'fabric' | 'material', name?: string }>(
  ctx: QueryCtx,
  material: T
): Promise<T & { name?: string, color?: string, size?: string, sku?: string }> => {
  if (material.type === 'material') {
    const variant = await ctx.db.get('materialVariants', material.id);
    if (!variant) return { ...material };
    const parent = await ctx.db.get('materials', variant.parentId);
    return { ...material, name: parent?.name ?? material.name, color: variant.color, size: variant.size, sku: variant.sku };
  }
  const variant = await ctx.db.get('fabricVariants', material.id);
  if (!variant) return { ...material };
  const parent = await ctx.db.get('fabrics', variant.parentId);
  return { ...material, name: parent?.name ?? material.name, color: variant.color, sku: variant.sku };
}

export const getSpecifications = query({
  handler: async (ctx) => {
    const specifications = await ctx.db.query('specifications').collect();
    return specifications;
  }
})

export const getSpecificationCategories = query({
  handler: async (ctx) => {
    const specifications = await ctx.db.query('specifications').collect();
    return [...new Set(specifications.map(s => s.category).filter(Boolean))];
  }
})

export const getSpecificationsWithMaterials = query({
  handler: async (ctx) => {
    const specifications = await ctx.db.query('specifications').collect();
    const withMaterials = await Promise.all(specifications.flatMap(async (spec) => {
      const mapData = await Promise.all(spec.materials.map((material) => resolveMaterialParent(ctx, material)));

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
      const mapData = await Promise.all(spec.materials.map((material) => resolveMaterialParent(ctx, material)));

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
    const patch = data?.materials
      ? { ...data, materials: data.materials.map(m => ({ ...m, lineId: m.lineId ?? crypto.randomUUID() })) }
      : data || {};
    const req = await ctx.db.patch(id, patch)
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

    const materials = await Promise.all(spec.materials.map((material) => resolveMaterialParent(ctx, material)));

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