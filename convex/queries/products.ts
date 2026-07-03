import { query, mutation, QueryCtx, internalQuery } from "../_generated/server";
import { paginationOptsValidator } from "convex/server";
import { groupBy, prop, keys, pick } from 'ramda';
import { getAll } from 'convex-helpers/server/relationships'
import { materialsSchema,   } from  "../schemas/storage";
import { Fabrics, Materials } from '../schema'
import { v } from "convex/values";
import { productSizes } from '../../src/constants';
import { Id } from "../_generated/dataModel";

///////// MATERIALS //////////

type Option = {
  label: string,
  value: string | number,
}

const addToAll = (value: any, data: Array<any>) => {
  const mapData = data.map(el => ({ ...el, ...value}));
  return mapData;
}

export const getFabricsByNameAndColors = async (ctx: QueryCtx, fabricName: string, colors?: Array<string>) => {
  const parent = await ctx.db
    .query('fabrics')
    .filter(q => q.eq(q.field('name'), fabricName))
    .first();
  if (!parent) return [];

  const variants = await ctx.db
    .query('fabricVariants')
    .withIndex('by_parentId', q => q.eq('parentId', parent._id))
    .collect();

  const sorted = variants.sort((a, b) => a.skuNumber - b.skuNumber);
  const result = sorted.map(v => ({
    color: v.color,
    _id: v._id,
    processingType: parent.processingType,
    fabricParentId: parent._id,
  }));

  return colors ? result.filter(v => colors.includes(v.color)) : result;
}

export const getSpecWithMaterials = async (ctx: QueryCtx, specId: Id<'specifications'>) => {
  const spec = await ctx.db.get('specifications', specId);
  if (!spec) return null;
  const mapData = await Promise.all(spec.materials.map(async (material) => {
    let data: Fabrics | Materials;
    if (material.fabricId) {
      data = await ctx.db.get('fabrics', material.fabricId) as Fabrics
      return {
        ...material,
        name: data?.name
      };
    }
    if (material.materialId) {
      data = await ctx.db.get('materials', material.materialId) as Materials
      return {
        ...material,
        name: data?.name,
      };
    }

    return material;
  }));

  return {
    ...spec,
    materials: mapData
  }

}

export const getProducts = query({
  args: {},
  handler: async (ctx) => {
    const materials = await ctx.db.query("materials").collect();
    return materials;
  }
})

export const getProductsBySpec = query({
  args: { specificationId: v.id('specifications') },
  handler: async (ctx, { specificationId }) => {
    return ctx.db
      .query('products')
      .withIndex('by_parentId', q => q.eq('parentId', specificationId))
      .collect();
  },
})

export const getSpecBaseFabricColors = query({
  args: { specificationId: v.id('specifications') },
  handler: async (ctx, { specificationId }) => {
    const spec = await ctx.db.get(specificationId);
    if (!spec) return [];

    const baseMaterial = spec.materials.find(m => m.type === 'base' && m.fabricId);
    if (!baseMaterial?.fabricId) return [];

    const baseFabric = await ctx.db.get('fabrics', baseMaterial.fabricId);
    if (!baseFabric?.name) return [];

    return getFabricsByNameAndColors(ctx, baseFabric.name);
  },
})

export const createProduct = mutation({
  args: materialsSchema,
  handler: async (ctx, args) => {
    const materials = await ctx.db.insert("materials", args);
    return materials;
  }
})

export const getProductsWithSpec = query({
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();
    const gproupedByParentId = groupBy(prop('parentId'), products);
    const specIds = keys(gproupedByParentId);
    const specs = await getAll(ctx.db, specIds) || [];
    const combineProducs = specs.flatMap((spec) => addToAll({ name: spec?.name, parentMaterials: spec?.materials }, gproupedByParentId[spec?._id as any] as unknown as Array<any> ));

    return combineProducs;
  }
})

export const getSearchProducts = query({
  args: { inputValue: v.string() },
  handler: async (ctx, args) => {
    const { inputValue } = args
    const products = await ctx.db
      .query("products")
      .withSearchIndex('search_text', q => q.search('searchText', inputValue))
      .take(10);
    const gproupedByParentId = groupBy(prop('parentId'), products);
    const specIds = keys(gproupedByParentId);
    const specs = await getAll(ctx.db, specIds) || [];
    const combineProducs = specs.flatMap((spec) => addToAll(
      { name: spec?.name, price: spec?.productionPrice },
      gproupedByParentId[spec?._id as any] as unknown as Array<any>
    ));

    return combineProducs;
  }
})

export const getProductsByManySku = internalQuery({
  args: { sku: v.array(v.string()) },
  handler: async (ctx, args) => {
    const data = args.sku || [];
    const products = await Promise.all(
      data.map(async (el) => await ctx.db.query("products").withIndex('search_sku', q => q.eq('sku', el)).unique())
    );
    return products;
  }
})

export const getProductsBySku = internalQuery({
  args: { sku: v.string() },
  handler: async (ctx, args) => {
    const product = await ctx.db.query("products").withIndex('search_sku', q => q.eq('sku', args.sku)).unique();
    if (!product) {
      throw Error(`Product with sku ${args.sku} not found`);
    }
    const spec = await ctx.db.get('specifications', product?.parentId);
    return {...product, parentData: spec };
  }
})

export const createProductsBySpecification = mutation({
  args: {
    name: v.string(), // fabricName
    allSizes: v.optional(v.boolean()),
    allColors: v.optional(v.boolean()),
    specification: v.id('specifications'),
    sizes: v.optional(v.array(v.object({ value: v.string(), label: v.string() }))),
    colors: v.optional(v.array(v.object({ value: v.string(), label: v.string() }))),
  },
  handler: async (ctx, args) => {
    const spec = await getSpecWithMaterials(ctx, args.specification);
    const checkSpectCreated = await ctx.db.query('products').filter(q => q.eq(q.field('parentId'), args.specification)).first();
    if (checkSpectCreated) throw new Error(`Products for specification with id ${args.specification} already created`);
    const sizes = args.allSizes ? productSizes : args.sizes?.map(size => size.value);
    const specFabric = spec?.materials.find(material => material.fabricId && material?.type === 'fabric');
    const fabricsByColors: Array<{ color: string, _id: string, processingType?: string | null }> = args.allColors 
      ? await getFabricsByNameAndColors(ctx, args.name)
      : await getFabricsByNameAndColors(ctx, args.name, args.colors?.map(color => color.value) || []);
    if (!spec) {
      throw new Error(`Specification with id ${args.specification} not found`);
    }
  
    let skuNumber = spec?.lastVariantIndex ?? 0;
    const combineProducts = fabricsByColors?.flatMap((fabric, colIndex) => sizes?.map((size, sIndex) => {
      const numberSku = ++skuNumber
      const data = {
        size,
        color: fabric?.color,
        parentId: spec?._id,
        skuNumber: numberSku,
        processingType: fabric?.processingType,
        searchText: `${spec?.name}.${size}.${fabric?.color}`,
        materials: [
          { fabricVariantId: fabric._id as any, multiplier: 1, lineId: specFabric?.lineId },
        ],
        sku: `${spec?.skuPrefix}-${String(numberSku).padStart(5, '0')}`,
      }
      return data;
    }))
    const addedData = combineProducts || [];
    await Promise.all(addedData?.map(async (value) => { await ctx.db.insert('products', value as any) }))
    await ctx.db.patch(args.specification, { lastVariantIndex: skuNumber });

    return combineProducts;
  }
})

export const createSpecVariants = mutation({
  args: {
    specificationId: v.id('specifications'),
    variants: v.array(v.object({ color: v.string(), size: v.string() })),
  },
  handler: async (ctx, { specificationId, variants }) => {
    const spec = await getSpecWithMaterials(ctx, specificationId);
    if (!spec) throw new Error('Специфікацію не знайдено');

    const baseMaterial = spec.materials.find(m => m.type === 'base' && m.fabricId);
    if (!baseMaterial?.fabricId) throw new Error('Base fabric not found in specification');

    const baseFabric = await ctx.db.get('fabrics', baseMaterial.fabricId);
    if (!baseFabric?.name) throw new Error('Base fabric not found');

    let skuNumber = spec.lastVariantIndex ?? 0;

    for (const { color, size } of variants) {
      const [fabricVariant] = await getFabricsByNameAndColors(ctx, baseFabric.name, [color]);
      const numberSku = ++skuNumber;
      await ctx.db.insert('products', {
        size,
        color,
        parentId: specificationId,
        skuNumber: numberSku,
        processingType: fabricVariant?.processingType ?? null,
        searchText: `${spec.name}.${size}.${color}`,
        materials: fabricVariant
          ? [{ fabricVariantId: fabricVariant._id as any, multiplier: 1, lineId: baseMaterial.lineId }]
          : [],
        sku: `${spec.skuPrefix}-${String(numberSku).padStart(5, '0')}`,
      });
    }

    await ctx.db.patch(specificationId, { lastVariantIndex: skuNumber });
  },
})

export const getProductsWithResolvedMaterials = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const result = await ctx.db.query('products').paginate(args.paginationOpts);

    const page = await Promise.all(result.page.map(async (product) => {
      const spec = await ctx.db.get('specifications', product.parentId);
      if (!spec) return { ...product, resolvedMaterials: [] };

      const productOverrides = product.materials || [];

      const effectiveMaterials = spec.materials.map((specMaterial) => {
        const override = productOverrides.find(
          (m: any) => m.overwriteMaterialId === (specMaterial.fabricId ?? specMaterial.materialId)
        );
        if (!override) return specMaterial;
        return {
          ...specMaterial,
          fabricId: override.fabricId ?? specMaterial.fabricId,
          materialId: override.materialId ?? specMaterial.materialId,
          multiplier: override.multiplier ?? '1',
        };
      });

      const resolvedMaterials = await Promise.all(effectiveMaterials.map(async (material: any) => {
        if (material.fabricId) {
          const fabric = await ctx.db.get(material.fabricId) as Fabrics | null;
          return { ...material, name: fabric?.name, color: fabric, units: fabric?.units };
        }
        // if (material.materialId) {
        //   const mat = await ctx.db.get(material.materialId) as Materials | null;
        //   return { ...material, name: mat?.name, size: mat?.size, color: mat?.color, units: mat?.units };
        // }
        return material;
      }));

      return { ...product, specName: spec.name, resolvedMaterials };
    }));

    return { ...result, page };
  },
});

export const getSpecMaterialLines = query({
  args: { specificationId: v.id('specifications') },
  handler: async (ctx, { specificationId }) => {
    const spec = await ctx.db.get(specificationId);
    if (!spec) return [];

    const lines = await Promise.all(spec.materials.map(async (m) => {
      if (!m.lineId) return null;
      const mat = m.materialId
        ? await ctx.db.get(m.materialId)
        : m.fabricId
          ? await ctx.db.get(m.fabricId)
          : null
      if (!mat) return null;

      return {
        lineId: m.lineId,
        fabricId: m.fabricId,
        units: m?.units ?? '—',
        name: mat?.name ?? '—',
        materialId: m.materialId,
        quantity: m?.quantity ?? '—',
      };
    }));

    return lines.filter((l): l is NonNullable<typeof l> => l !== null);
  },
})

export const bulkUpdateProductMaterials = mutation({
  args: {
    productIds: v.array(v.id('products')),
    updates: v.array(v.object({
      lineId: v.string(),
      fabricVariantId: v.optional(v.id('fabricVariants')),
      materialVariantId: v.optional(v.id('materialVariants')),
    })),
  },
  handler: async (ctx, { productIds, updates }) => {
    await Promise.all(productIds.map(async (productId) => {
      const product = await ctx.db.get(productId);
      if (!product) return;

      const currentMaterials = product.materials ?? [];
      const updatedMaterials = currentMaterials.map(cur => {
        if (!cur.lineId) return cur;
        const upd = updates.find(u => u.lineId === cur.lineId);
        if (!upd) return cur;
        return {
          ...cur,
          ...(upd.fabricVariantId !== undefined ? { fabricVariantId: upd.fabricVariantId } : {}),
          ...(upd.materialVariantId !== undefined ? { materialVariantId: upd.materialVariantId } : {}),
        };
      });

      const newEntries = updates
        .filter(upd => !currentMaterials.some(cur => cur.lineId === upd.lineId))
        .map(upd => ({
          lineId: upd.lineId,
          fabricVariantId: upd.fabricVariantId,
          materialVariantId: upd.materialVariantId,
        }));

      await ctx.db.patch(productId, { materials: [...updatedMaterials, ...newEntries] });
    }));
  },
})

export const updateProducts = mutation({
  args: {
    ids: v.array(v.id('products')),
    materials: v.array(v.object({
      overwriteMaterialId: v.union(v.id('materials'), v.id('fabrics')),
      multiplier: v.optional(v.number()),
      fabricId: v.optional(v.id('fabrics')),
      materialId: v.optional(v.id('materials')),
    }))
  },
  handler: async (ctx, args) => {
    const { ids, materials } = args;
    await Promise.all(ids.map(async (id) => {
      const product = await ctx.db.get('products', id);
      if (!product) {
        throw new Error(`Product with id ${id} not found`);
      }
      const currentMaterials = product.materials || [];
      const updatedMaterials = [
        // overwrite matching parents, keep non-matching parents as-is
        ...currentMaterials.flatMap((parent) => {
          const incoming = materials.find((m) => m.overwriteMaterialId === parent.overwriteMaterialId);
          if (!incoming) return [parent];
          return [{
            overwriteMaterialId: parent.overwriteMaterialId,
            multiplier: incoming.multiplier,
            ...(incoming.fabricId ? { fabricId: incoming.fabricId } : {}),
            ...(incoming.materialId ? { materialId: incoming.materialId } : {}),
          }];
        }),
        // add incoming entries that have no matching parent
        ...materials.filter((incoming) =>
          !currentMaterials.some((parent) => parent.overwriteMaterialId === incoming.overwriteMaterialId)
        ),
      ];
      await ctx.db.patch(id, { materials: updatedMaterials });
    }))
  }
})

export const getProductVariantDetails = query({
  args: { productId: v.id('products') },
  handler: async (ctx, { productId }) => {
    const product = await ctx.db.get(productId);
    if (!product) return null;

    const spec = await ctx.db.get('specifications', product.parentId);
    if (!spec) return null;

    const productMaterials = product.materials ?? [];

    const lines = await Promise.all(spec.materials.map(async (specMat) => {
      const assignment = productMaterials.find(m => m.lineId === specMat.lineId);

      let assignedVariant: { label: string; sku?: string } | null = null;

      if (assignment?.fabricVariantId) {
        const fv = await ctx.db.get(assignment.fabricVariantId);
        const fabric = fv ? await ctx.db.get('fabrics', fv.parentId) : null;
        assignedVariant = {
          label: [fabric?.name, fv?.color].filter(Boolean).join(' · '),
          sku: fv?.sku,
        };
      } else if (assignment?.materialVariantId) {
        const mv = await ctx.db.get(assignment.materialVariantId);
        const material = mv ? await ctx.db.get('materials', mv.parentId) : null;
        assignedVariant = {
          label: [material?.name, mv?.color, mv?.size].filter(Boolean).join(' · '),
          sku: mv?.sku,
        };
      }

      const parentMat = specMat.materialId
        ? await ctx.db.get(specMat.materialId)
        : specMat.fabricId
          ? await ctx.db.get(specMat.fabricId)
          : null;

      return {
        lineId: specMat.lineId,
        name: parentMat?.name ?? specMat.materialName ?? '—',
        quantity: specMat.quantity,
        units: specMat.units,
        type: specMat.type,
        assignedVariant,
      };
    }));

    return {
      sku: product.sku,
      size: product.size,
      color: product.color,
      lines,
    };
  },
})
