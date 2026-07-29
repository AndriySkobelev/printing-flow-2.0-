import { query, mutation, QueryCtx, internalQuery, internalMutation } from "../_generated/server";
import { paginationOptsValidator } from "convex/server";
import { groupBy, prop, keys } from 'ramda';
import { getAll } from 'convex-helpers/server/relationships'
import { materialsSchema,   } from  "../schemas/storage";
import { v } from "convex/values";
import { productSizes } from '../../src/constants';
import { Id } from "../_generated/dataModel";
import { resolveMaterialParent, resolveMaterialVariant } from './specifications';

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
    .withIndex('by_name', q => q.eq('name', fabricName))
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
  const mapData = await Promise.all(spec.materials.map((material) => resolveMaterialParent(ctx, material)));

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

    // Convention: the first material line is always the base fabric.
    const baseMaterial = spec.materials[0];
    if (!baseMaterial) return [];

    const baseFabric = await ctx.db.get('fabrics', baseMaterial.id as Id<'fabrics'>);
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

// Fetches everything migrateSpecificationToKeyCrm needs without giving the
// action direct db access: the spec's own KeyCRM-facing fields (name, price,
// category, and whichever parent product it's already attached to, if any),
// plus the specific variants to migrate — either the given `productIds`, or
// (when omitted, for "migrate all") every not-yet-migrated variant of the spec.
export const getSpecForKeyCrmMigration = internalQuery({
  args: {
    specificationId: v.id('specifications'),
    productIds: v.optional(v.array(v.id('products'))),
  },
  handler: async (ctx, { specificationId, productIds }) => {
    const spec = await ctx.db.get(specificationId);
    if (!spec) throw new Error('Специфікацію не знайдено');

    const allVariants = await ctx.db
      .query('products')
      .withIndex('by_parentId', q => q.eq('parentId', specificationId))
      .collect();
    const variants = productIds
      ? allVariants.filter(v => productIds.includes(v._id))
      : allVariants.filter(v => !v.migrated);

    return {
      spec: {
        name: spec.name,
        skuPrefix: spec.skuPrefix,
        price: spec.productionPrice,
        categoryCrmId: spec.category_crm_id,
        keycrmProductId: spec.keycrm_product_id,
      },
      variants: variants.map(v => ({ productId: v._id, sku: v.sku, size: v.size, color: v.color })),
    };
  },
})

// Records the KeyCRM parent product created for this spec's variants (offers)
// so a later migration reuses it instead of creating a duplicate product.
export const markSpecificationKeyCrmProduct = internalMutation({
  args: { specificationId: v.id('specifications'), keycrmProductId: v.number() },
  handler: async (ctx, { specificationId, keycrmProductId }) => {
    await ctx.db.patch(specificationId, { keycrm_product_id: keycrmProductId, migrated: true });
  },
})

// Stamps productVariants with the moment they were last pushed to KeyCRM.
export const markProductsSyncedToKeyCrm = internalMutation({
  args: { productIds: v.array(v.id('products')) },
  handler: async (ctx, { productIds }) => {
    const synced_at = Date.now();
    await Promise.all(productIds.map(id => ctx.db.patch(id, { synced_at, migrated: true })));
  },
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
    const checkSpectCreated = await ctx.db.query('products').withIndex('by_parentId', q => q.eq('parentId', args.specification)).first();
    if (checkSpectCreated) throw new Error(`Products for specification with id ${args.specification} already created`);
    const sizes = args.allSizes ? productSizes : args.sizes?.map(size => size.value);
    // Convention: the first material line is always the base fabric.
    const specFabric = spec?.materials[0];
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
          { id: fabric._id as any, type: 'fabric' as const, multiplier: 1, lineId: specFabric?.lineId },
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

    // Convention: the first material line is always the base fabric.
    const baseMaterial = spec.materials[0];
    if (!baseMaterial) throw new Error('Base fabric not found in specification');

    const baseFabric = await ctx.db.get('fabrics', baseMaterial.id as Id<'fabrics'>);
    if (!baseFabric?.name) throw new Error('Base fabric not found');

    // Fetch the fabric's variants once instead of re-querying (and re-reading
    // every variant of the fabric) on each loop iteration — with enough
    // variants requested at once that blew past Convex's per-mutation read limit.
    const fabricVariants = await getFabricsByNameAndColors(ctx, baseFabric.name);
    const fabricVariantByColor = new Map(fabricVariants.map(v => [v.color, v]));

    let skuNumber = spec.lastVariantIndex ?? 0;

    for (const { color, size } of variants) {
      const colorFabricVariant = fabricVariantByColor.get(color);
      const numberSku = ++skuNumber;
      await ctx.db.insert('products', {
        size,
        color,
        parentId: specificationId,
        skuNumber: numberSku,
        processingType: colorFabricVariant?.processingType ?? null,
        searchText: `${spec.name}.${size}.${color}`,
        materials: colorFabricVariant
          ? [{ id: colorFabricVariant._id as any, type: 'fabric' as const, multiplier: 1, lineId: baseMaterial.lineId }]
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

      const resolvedMaterials = await Promise.all(spec.materials.map(async (specMaterial) => {
        const override = productOverrides.find((m) => m.lineId && m.lineId === specMaterial.lineId);
        if (!override) return resolveMaterialParent(ctx, specMaterial);
        return resolveMaterialVariant(ctx, { ...specMaterial, id: override.id, type: override.type ?? specMaterial.type, multiplier: override.multiplier ?? 1 });
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
      const resolved = await resolveMaterialParent(ctx, m);
      if (!resolved.name) return null;

      return {
        lineId: m.lineId,
        id: m.id,
        type: m.type,
        units: m?.units ?? '—',
        name: resolved.name ?? '—',
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
      id: v.union(v.id('materialVariants'), v.id('fabricVariants')),
      type: v.union(v.literal('fabric'), v.literal('material')),
      multiplier: v.optional(v.number()),
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
        return { lineId: cur.lineId, id: upd.id, type: upd.type, multiplier: upd.multiplier ?? cur.multiplier };
      });

      const newEntries = updates
        .filter(upd => !currentMaterials.some(cur => cur.lineId === upd.lineId))
        .map(upd => ({ lineId: upd.lineId, id: upd.id, type: upd.type, multiplier: upd.multiplier }));

      await ctx.db.patch(productId, { materials: [...updatedMaterials, ...newEntries] });
    }));
  },
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
      const specResolved = await resolveMaterialParent(ctx, specMat);

      const assignment = productMaterials.find(m => m.lineId === specMat.lineId);
      let assignedVariant: { label: string; sku?: string } | null = null;
      if (assignment) {
        const assignedResolved: any = await resolveMaterialVariant(ctx, assignment);
        assignedVariant = {
          label: [assignedResolved.name, assignedResolved.color, assignedResolved.size].filter(Boolean).join(' · '),
          sku: assignedResolved.sku,
        };
      }

      return {
        lineId: specMat.lineId,
        name: specResolved.name ?? '—',
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
