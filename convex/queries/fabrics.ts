import { query, mutation } from "../_generated/server";
import { fabricsSchema, fabricVariantsSchema } from "../schemas/storage";
import { v } from "convex/values";
import fabricsRows from "../../src/custom-data/fabrics_rows";

export const getFabrics = query({
  handler: async (ctx) => {
    const fabrics = await ctx.db.query("fabrics").collect();
    return Promise.all(
      fabrics.map(async (fabric) => {
        const variants = await ctx.db
          .query("fabricVariants")
          .withIndex("by_parentId", q => q.eq("parentId", fabric._id))
          .collect();
        return { ...fabric, variants };
      })
    );
  },
})

export const getFabricsOptions = query({
  args: { inputValue: v.string() },
  handler: async (ctx, { inputValue }) => {
    return ctx.db
      .query("fabrics")
      .withSearchIndex("search_name", q => q.search("name", inputValue))
      .collect()
  },
})

export const getFabricsByName = query({
  args: { fabricName: v.string() },
  handler: async (ctx, { fabricName }) => {
    const fabric = await ctx.db
      .query("fabrics")
      .filter(q => q.eq(q.field("name"), fabricName))
      .first();
    if (!fabric) return null;
    const variants = await ctx.db
      .query("fabricVariants")
      .withIndex("by_parentId", q => q.eq("parentId", fabric._id))
      .collect();
    return { ...fabric, variants };
  },
})

export const getFabricById = query({
  args: { id: v.id("fabrics") },
  handler: async (ctx, { id }) => {
    const fabric = await ctx.db.get(id);
    if (!fabric) throw new Error(`Fabric with id ${id} not found`);
    const variants = await ctx.db
      .query("fabricVariants")
      .withIndex("by_parentId", q => q.eq("parentId", id))
      .collect();
    return { ...fabric, variants };
  },
})

export const createFabric = mutation({
  args: {
    name: fabricsSchema.name,
    skuPrefix: fabricsSchema.skuPrefix,
    units: fabricsSchema.units,
    processingType: fabricsSchema.processingType,
  },
  handler: async (ctx, { name, skuPrefix, units, processingType }) => {
    return ctx.db.insert("fabrics", { name, skuPrefix, units, processingType, lastIndexVariant: 0 });
  },
})

export const addFabricVariant = mutation({
  args: {
    parentId: v.id("fabrics"),
    color: v.string(),
    threds: fabricVariantsSchema.threds,
  },
  handler: async (ctx, { parentId, color, threds }) => {
    const parent = await ctx.db.get(parentId);
    if (!parent) throw new Error("Fabric not found");

    const nextIndex = (parent.lastIndexVariant ?? 0) + 1;
    const variantId = await ctx.db.insert("fabricVariants", {
      color,
      parentId,
      skuNumber: nextIndex,
      sku: `${parent.skuPrefix}-${String(nextIndex).padStart(3, "0")}`,
      threds,
    });

    await ctx.db.patch(parentId, { lastIndexVariant: nextIndex });
    return variantId;
  },
})

export const addFabricVariants = mutation({
  args: {
    parentId: v.id("fabrics"),
    colors: v.array(v.string()),
    threds: fabricVariantsSchema.threds,
  },
  handler: async (ctx, { parentId, colors, threds }) => {
    const parent = await ctx.db.get(parentId);
    if (!parent) throw new Error("Fabric not found");

    let nextIndex = parent.lastIndexVariant ?? 0;
    for (const color of colors) {
      nextIndex++;
      await ctx.db.insert("fabricVariants", {
        color,
        parentId,
        skuNumber: nextIndex,
        sku: `${parent.skuPrefix}-${String(nextIndex).padStart(3, "0")}`,
        threds,
      });
    }
    await ctx.db.patch(parentId, { lastIndexVariant: nextIndex });
  },
})

export const updateFabric = mutation({
  args: {
    id: v.id("fabrics"),
    name: v.optional(fabricsSchema.name),
    skuPrefix: v.optional(fabricsSchema.skuPrefix),
    units: v.optional(fabricsSchema.units),
    processingType: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, { id, ...data }) => {
    await ctx.db.patch(id, data);
  },
})

export const updateFabricVariant = mutation({
  args: {
    id: v.id("fabricVariants"),
    color: v.optional(fabricVariantsSchema.color),
    threds: v.optional(fabricVariantsSchema.threds),
  },
  handler: async (ctx, { id, ...data }) => {
    await ctx.db.patch(id, data);
  },
})

export const deleteFabric = mutation({
  args: { id: v.id("fabrics") },
  handler: async (ctx, { id }) => {
    const variants = await ctx.db
      .query("fabricVariants")
      .withIndex("by_parentId", q => q.eq("parentId", id))
      .collect();
    await Promise.all(variants.map(v => ctx.db.delete(v._id)));
    await ctx.db.delete(id);
  },
})

export const deleteFabricVariant = mutation({
  args: { id: v.id("fabricVariants") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
})

// ─── Legacy migration helpers ─────────────────────────────────────────────────

export const migrateFleeceProcessingType = mutation({
  args: {},
  handler: async (ctx) => {
    const fabrics = await ctx.db.query("fabrics").collect()
    const fleeceRegex = /на\s+флісі/i
    const matches = fabrics.filter(f => fleeceRegex.test(f.name ?? ""))
    await Promise.all(matches.map(f => ctx.db.patch(f._id, { processingType: "Начос" })))
    return { updated: matches.length }
  },
})

export const migrateFabricsAddName = mutation({
  handler: async () => ({ updated: 0 }),
})

export const seedFabricsFromStaticData = mutation({
  handler: async (ctx) => {
    const byName = new Map<string, typeof fabricsRows>();
    for (const r of fabricsRows) {
      if (!byName.has(r.fabricName)) byName.set(r.fabricName, []);
      byName.get(r.fabricName)!.push(r);
    }

    let parentCount = 0;
    let variantCount = 0;

    for (const [name, records] of byName) {
      const sorted = records.slice().sort((a, b) => a.skuNumber - b.skuNumber);
      const first = sorted[0];

      const parentId = await ctx.db.insert("fabrics", {
        name,
        skuPrefix: first.skuPrefix,
        units: first.units,
        processingType: first.processingType ?? null,
        updatedAt: first.updatedAt,
        lastIndexVariant: sorted.length,
      });
      parentCount++;

      for (const r of sorted) {
        await ctx.db.insert("fabricVariants", {
          color: r.color,
          skuNumber: r.skuNumber,
          sku: r.sku,
          threds: r.threds ?? null,
          parentId,
        });
        variantCount++;
      }
    }

    return { parents: parentCount, variants: variantCount };
  },
})
