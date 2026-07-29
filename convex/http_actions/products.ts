import { v } from "convex/values";
import { keyRequest } from "../../src/utils";
import { action } from "../_generated/server";
import { internal } from "../_generated/api";

// Only the categories under our KeyCRM parent category (id 15) are relevant —
// the account has other unrelated top-level category trees.
const CATEGORY_PARENT_ID = 15;

export const getKeyCrmProductCategories = action({
  args: {},
  handler: async () => {
    const res = await keyRequest('/products/categories', 'get');
    if (!res.ok) {
      throw new Error(`KeyCRM categories fetch failed (${res.status}): ${await res.text()}`);
    }
    const data = await res.json();
    // KeyCRM wraps list responses as { data: [...] } — extract the array.
    const categories = (Array.isArray(data) ? data : (data?.data ?? [])) as Array<{ id: number; name: string; parent_id?: number | null }>;
    return categories.filter(c => c.parent_id === CATEGORY_PARENT_ID);
  },
});

// Migrates a specification to KeyCRM as one parent product with an offer per
// variant (size/color) — matching KeyCRM's actual product/offer model, rather
// than the old flat "one product per variant" import. The first migration for
// a spec creates the parent product (POST /products) and remembers its id
// (keycrm_product_id); every migration after that (e.g. new variants added
// later) reuses that id and only posts new offers, so the parent is never
// duplicated. When `productIds` is omitted, every not-yet-migrated variant of
// the spec is sent — this is what the spec-level "Мігрувати все" button uses;
// spec-variants-table's per-selection migrate passes explicit `productIds`.
export const migrateSpecificationToKeyCrm = action({
  args: {
    specificationId: v.id('specifications'),
    productIds: v.optional(v.array(v.id('products'))),
  },
  handler: async (ctx, { specificationId, productIds }): Promise<{
    productCreated: boolean;
    offersCreated: number;
    skipped: Array<{ sku: string; reason: string }>;
  }> => {
    const { spec, variants } = await ctx.runQuery(internal.queries.products.getSpecForKeyCrmMigration, {
      specificationId,
      productIds,
    });

    const price = Number(spec.price);
    if (!spec.price || Number.isNaN(price)) {
      return {
        productCreated: false,
        offersCreated: 0,
        skipped: variants.map(v => ({ sku: v.sku, reason: 'Немає ціни (productionPrice) у специфікації' })),
      };
    }

    if (variants.length === 0) return { productCreated: false, offersCreated: 0, skipped: [] };

    let keycrmProductId = spec.keycrmProductId;
    const productCreated = !keycrmProductId;

    if (!keycrmProductId) {
      const res = await keyRequest('/products', 'post', undefined, {
        name: `[m] ${spec.name}`,
        sku: spec.skuPrefix,
        price,
        currency_code: 'UAH',
        unit_type: 'шт',
        ...(spec.categoryCrmId ? { category_id: spec.categoryCrmId } : {}),
      });
      if (!res.ok) {
        throw new Error(`KeyCRM product creation failed (${res.status}): ${await res.text()}`);
      }
      const created = await res.json();
      keycrmProductId = created?.id ?? created?.data?.id;
      if (!keycrmProductId) throw new Error('KeyCRM не повернув id створеного товару');

      await ctx.runMutation(internal.queries.products.markSpecificationKeyCrmProduct, {
        specificationId,
        keycrmProductId,
      });
    }

    const offersRes = await keyRequest(`/products/${keycrmProductId}/offers`, 'post', undefined, {
      offers: variants.map(v => ({
        sku: v.sku,
        price,
        properties: [
          { name: 'Розмір', value: v.size },
          { name: 'Колір', value: v.color },
        ],
      })),
    });

    if (!offersRes.ok) {
      throw new Error(`KeyCRM offers creation failed (${offersRes.status}): ${await offersRes.text()}`);
    }

    await ctx.runMutation(internal.queries.products.markProductsSyncedToKeyCrm, {
      productIds: variants.map(v => v.productId),
    });

    return { productCreated, offersCreated: variants.length, skipped: [] };
  },
});
