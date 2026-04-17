import { query, mutation, QueryCtx, internalQuery } from "../_generated/server";
import { groupBy, prop, keys, pick } from 'ramda';
import { getAll } from 'convex-helpers/server/relationships'
import { Fabrics, Materials, materialsSchema,   } from "../schema";
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
  const getFabric = await ctx.db.query('fabrics').filter(q => q.eq(q.field('fabricName'), fabricName)).collect();
  const sortedFabrics = getFabric.sort((a, b) => a.skuNumber - b.skuNumber);
  const getFabrics= sortedFabrics.map((el) => (pick(['color', '_id'], el)));
  let filteredFabrics = getFabrics;
  if (colors) {
    filteredFabrics = getFabrics.filter(el => colors.includes(el.color));
  }
  return filteredFabrics;
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
        name: data?.fabricName
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
    console.log("🚀 ~ spec:", spec)
    const sizes = args.allSizes ? productSizes : args.sizes?.map(size => size.value);
    const specFabric = spec?.materials.find(material => material.fabricId && material?.type === 'fabric');
    const fabricsByColors: Array<{ color: string, _id: string}> = args.allColors 
      ? await getFabricsByNameAndColors(ctx, args.name)
      : await getFabricsByNameAndColors(ctx, args.name, args.colors?.map(color => color.value) || []);
    if (!spec) {
      throw new Error(`Specification with id ${args.specification} not found`);
    }
  
    let skuNumber = 1;
    const combineProducts = fabricsByColors?.flatMap((fabric, colIndex) => sizes?.map((size, sIndex) => {
      const numberSku = skuNumber++
      const data = {
        size,
        color: fabric?.color,
        parentId: spec?._id,
        skuNumber: numberSku,
        searchText: `${spec?.name}.${size}.${fabric?.color}`,
        materials: [
          { fabricId: fabric._id, multiplier: 1, overwriteMaterialId: specFabric?.fabricId },
        ],
        sku: `${spec?.skuPrefix}-${String(numberSku).padStart(5, '0')}`,
      }
      return data;
    }))
    console.log("🚀 ~ combineProducts:", combineProducts)
    const addedData = combineProducts || [];
    await Promise.all(addedData?.map(async (value) => { await ctx.db.insert('products', value as any) }))

    return combineProducts;
  }
})

export const getProductsWithResolvedMaterials = query({
  handler: async (ctx) => {
    const products = await ctx.db.query('products').collect();

    return Promise.all(products.map(async (product) => {
      const spec = await ctx.db.get('specifications', product.parentId);
      if (!spec) return { ...product, resolvedMaterials: [] };

      const productOverrides = product.materials || [];

      // Start from spec parent materials, apply product overrides by overwriteMaterialId
      const effectiveMaterials = spec.materials.map((specMaterial) => {
        const override = productOverrides.find(
          (m) => m.overwriteMaterialId === (specMaterial.fabricId ?? specMaterial.materialId)
        );
        if (!override) return specMaterial;
        return {
          ...specMaterial,
          fabricId: override.fabricId ?? specMaterial.fabricId,
          materialId: override.materialId ?? specMaterial.materialId,
          multiplier: override.multiplier ?? '1',
        };
      });

      // Resolve each effective material to its full data
      const resolvedMaterials = await Promise.all(effectiveMaterials.map(async (material) => {
        if (material.fabricId) {
          const fabric = await ctx.db.get(material.fabricId) as Fabrics | null;
          return {
            ...material,
            name: fabric?.fabricName,
            color: fabric?.color,
            units: fabric?.units,
          };
        }
        if (material.materialId) {
          const mat = await ctx.db.get(material.materialId) as Materials | null;
          return {
            ...material,
            name: mat?.name,
            size: mat?.size,
            color: mat?.color,
            units: mat?.units,
          };
        }
        return material;
      }));

      return {
        ...product,
        specName: spec.name,
        resolvedMaterials,
      };
    }));
  },
});

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
