import { getAll } from "convex-helpers/server/relationships";
import { query, mutation, type MutationCtx } from "../_generated/server";
import { type Id } from "../_generated/dataModel";
import { materialsSchema } from "../schemas/storage";
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
    const materials = await ctx.db.query("fabrics").filter((q) => q.eq(q.field('name'), args.fabricName)).collect();
    return materials;
  }
})

export const checkMaterialSkuPrefix = query({
  args: { skuPrefix: v.string() },
  handler: async (ctx, { skuPrefix }) => {
    const existing = await ctx.db
      .query('materials')
      .withIndex('by_skuPrefix', q => q.eq('skuPrefix', skuPrefix))
      .first();
    return { exists: existing !== null };
  },
})

export const getMaterialOptions = query({
  args: { inputValue: v.string() },
  handler: async (ctx, args) => {
    const materials = await ctx.db
    .query("materials")
    .withSearchIndex('search_name', q => q.search('name', args.inputValue))
    .take(20);
    return materials;
  }
})

export const getMaterialWithVariants = query({
  args: { id: v.id('materials') },
  handler: async (ctx, { id }) => {
    const material = await ctx.db.get(id);
    if (!material) return null;
    const variants = await ctx.db
      .query('materialVariants')
      .withIndex('by_parentId', q => q.eq('parentId', id))
      .collect();
    const sorted = variants.sort((a, b) => a.skuNumber - b.skuNumber);
    return { ...material, variants: sorted };
  },
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
  handler: async (_ctx) => {
    return null;
  }
})

const insertMissingVariants = async (
  ctx: MutationCtx,
  parentId: Id<'materials'>,
  skuPrefix: string,
  name: string,
  startIndex: number,
  colors: string[],
  sizes: string[],
) => {
  const existing = await ctx.db
    .query('materialVariants')
    .withIndex('by_parentId', q => q.eq('parentId', parentId))
    .collect();

  const existingKeys = new Set(existing.map(v => `${v.color}__${v.size}`));
  let skuNumber = startIndex;

  for (const color of colors) {
    for (const size of sizes) {
      if (existingKeys.has(`${color}__${size}`)) continue;
      skuNumber++;
      await ctx.db.insert('materialVariants', {
        parentId,
        color,
        size,
        skuNumber,
        sku: `${skuPrefix}-${String(skuNumber).padStart(3, '0')}`,
        searchText: `${name}.${color}${size ? `.${size}` : ''}`,
      });
    }
  }

  await ctx.db.patch(parentId, { lastVariantIndex: skuNumber });
};

export const createMaterialWithVariants = mutation({
  args: {
    name: v.string(),
    skuPrefix: v.string(),
    units: v.string(),
    category: v.string(),
    material: v.optional(v.string()),
    colors: v.array(v.string()),
    sizes: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { colors, sizes, ...parentData }) => {
    const sizeList = sizes && sizes.length > 0 ? sizes : [''];
    const parentId = await ctx.db.insert('materials', {
      ...parentData,
      colors,
      sizes,
      lastVariantIndex: 0,
    });
    await insertMissingVariants(ctx, parentId, parentData.skuPrefix, parentData.name, 0, colors, sizeList);
    return parentId;
  },
})

export const addMaterialColors = mutation({
  args: {
    id: v.id('materials'),
    colors: v.array(v.string()),
  },
  handler: async (ctx, { id, colors }) => {
    const material = await ctx.db.get(id);
    if (!material) throw new Error('Material not found');
    const sizeList = material.sizes && material.sizes.length > 0 ? material.sizes : [''];
    await insertMissingVariants(ctx, id, material.skuPrefix, material.name, material.lastVariantIndex ?? 0, colors, sizeList);
    const newColors = Array.from(new Set([...(material.colors ?? []), ...colors]));
    await ctx.db.patch(id, { colors: newColors });
  },
})

export const addMaterialSizes = mutation({
  args: {
    id: v.id('materials'),
    sizes: v.array(v.string()),
  },
  handler: async (ctx, { id, sizes }) => {
    const material = await ctx.db.get(id);
    if (!material) throw new Error('Material not found');
    const colorList = material.colors ?? [];
    await insertMissingVariants(ctx, id, material.skuPrefix, material.name, material.lastVariantIndex ?? 0, colorList, sizes);
    const newSizes = Array.from(new Set([...(material.sizes ?? []), ...sizes]));
    await ctx.db.patch(id, { sizes: newSizes });
  },
})

export const renameMaterialColor = mutation({
  args: { id: v.id('materials'), oldColor: v.string(), newColor: v.string() },
  handler: async (ctx, { id, oldColor, newColor }) => {
    const material = await ctx.db.get(id);
    if (!material) throw new Error('Material not found');
    const newColors = (material.colors ?? []).map(c => c === oldColor ? newColor : c);
    await ctx.db.patch(id, { colors: newColors });
    const variants = await ctx.db.query('materialVariants').withIndex('by_parentId', q => q.eq('parentId', id)).collect();
    await Promise.all(
      variants.filter(v => v.color === oldColor).map(v =>
        ctx.db.patch(v._id, { color: newColor, searchText: v.searchText?.replace(oldColor, newColor) })
      )
    );
  },
})

export const renameMaterialSize = mutation({
  args: { id: v.id('materials'), oldSize: v.string(), newSize: v.string() },
  handler: async (ctx, { id, oldSize, newSize }) => {
    const material = await ctx.db.get(id);
    if (!material) throw new Error('Material not found');
    const newSizes = (material.sizes ?? []).map(s => s === oldSize ? newSize : s);
    await ctx.db.patch(id, { sizes: newSizes });
    const variants = await ctx.db.query('materialVariants').withIndex('by_parentId', q => q.eq('parentId', id)).collect();
    await Promise.all(
      variants.filter(v => v.size === oldSize).map(v =>
        ctx.db.patch(v._id, { size: newSize })
      )
    );
  },
})

export const updateMaterial = mutation({
  args: {
    id: v.id('materials'),
    data: v.object({
      name: v.optional(v.string()),
      color: v.optional(v.string()),
      units: v.optional(v.string()),
      category: v.optional(v.string()),
      size: v.optional(v.string()),
      code: v.optional(v.string()),
      material: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, args.data);
  },
})

export const deleteMaterial = mutation({
  args: { id: v.id('materials') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
})
///////// MUTATIONS //////////