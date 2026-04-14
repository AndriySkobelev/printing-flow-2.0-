import { query, mutation, internalMutation } from "../_generated/server";
import { storeMovementsSchema  } from "../schema";

export const getMovements = query({
  args: {},
  handler: async (ctx) => {
    const movments = await ctx.db.query('storeMovements').collect();
    return movments;
  }
})

export const getMovementsWithMaterials = query({
  args: {},
  handler: async (ctx) => {
    const movments = await ctx.db.query('storeMovements').collect();
    const movmentsWithMaterials = await Promise.all(movments.map(async (movement) => {
      // if (movement.matrialType === 'materials' && movement.materialId) {
      //   const material = await ctx.db.get(movement.materialId);
      //   return {
      //     ...movement,
      //     material,
      //     sku: material?.sku,
      //     name: material?.name,
      //     color: material?.color,
      //   }
      // }
      // if (movement?.materialId) {
      //   const fabric = await ctx.db.query('fabrics', movement?.materialId).collect();
      //   return {
      //     ...movement,
      //     material: fabric,
      //     sku: fabric?.sku,
      //     color: fabric?.color,
      //     name: fabric?.fabricName,
      //   }
      // }
      return movement;
    }));
    return movmentsWithMaterials;
  }
})

export const createIncoming = mutation({
  args: storeMovementsSchema,
  handler: async (ctx, args) => {
    const materials = await ctx.db.insert("storeMovements", args);
    return materials;
  }
})

export const createIncomingInternal = internalMutation({
  args: storeMovementsSchema,
  handler: async (ctx, args) => {
    const movement = await ctx.db.insert("storeMovements", args);
    return movement;
  }
})