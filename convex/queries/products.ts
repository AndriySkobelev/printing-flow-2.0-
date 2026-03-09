import { query, mutation, QueryCtx, internalQuery } from "../_generated/server";
import { groupBy, prop, keys } from 'ramda';
import { getAll } from 'convex-helpers/server/relationships'
import { materialsSchema,   } from "../schema";
import { v } from "convex/values";
import { productSizes } from '../../src/constants';

///////// MATERIALS //////////

type Option = {
  label: string,
  value: string | number,
}

const addToAll = (value: any, data: Array<any>) => {
  const mapData = data.map(el => ({ ...el, ...value}));
  return mapData;
}


export const getFabricsByName = async (ctx: QueryCtx, fabricName: string) => {
  const getFabric = await ctx.db.query('fabrics').filter(q => q.eq(q.field('fabricName'), fabricName)).collect();
  const sortedFabrics = getFabric.sort((a, b) => a.skuNumber - b.skuNumber);
  const getColors = sortedFabrics.map((el) => el.color);
  console.log("🚀 ~ getFabricsByName ~ getColors:", getColors)
  return getColors;
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
    const combineProducs = specs.flatMap((spec) => addToAll({ name: spec?.name }, gproupedByParentId[spec?._id as any] as unknown as Array<any> ));

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
    allSizes: v.optional(v.boolean()),
    allColors: v.optional(v.boolean()),
    fabricName: v.optional(v.string()),
    specification: v.id('specifications'),
    sizes: v.optional(v.array(v.object({ value: v.string(), label: v.string() }))),
    colors: v.optional(v.array(v.object({ value: v.string(), label: v.string() }))),
  },
  handler: async (ctx, args) => {
    const spec = await ctx.db.get('specifications', args.specification);
    const sizes = args.allSizes ? productSizes : args.sizes?.map(size => size.value);
    let colors = args.colors?.map(size => size.value);;
    if (!spec) {
      throw new Error(`Specification with id ${args.specification} not found`);
    }
  
    if (args.allColors && args.fabricName) {
      const colorsByFabric = await getFabricsByName(ctx, args.fabricName)
      colors = colorsByFabric;
    }
    let skuNumber = 1;
    const combineProducts = colors?.flatMap((color, colIndex) => sizes?.map((size, sIndex) => {
      const numberSku = skuNumber++
      const data = {
        size,
        color,
        style: 'Базова',
        parentId: spec?._id,
        skuNumber: numberSku,
        sku: `${spec?.skuPrefix}-${String(numberSku).padStart(5, '0')}`,
      }
      return data;
    }))
    const addedData = combineProducts || [];
    await Promise.all(addedData?.map(async (value) => { await ctx.db.insert('products', value as any) }))

    return combineProducts;
  }
})
