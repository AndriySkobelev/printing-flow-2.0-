import { query, mutation, internalMutation } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { storeMovementsSchema  } from "../schema";


export const getMovements = query({
  args: {},
  handler: async (ctx) => {
    const movments = await ctx.db.query('storeMovements').collect();
    return movments;
  }
})

export const getMovementsWithMaterials = query({
  handler: async (ctx) => {
    const movments = await ctx.db.query('storeMovements').collect();
    const movmentsWithMaterials = await Promise.all(movments.map(async (movement) => {
      if (movement.materialType === 'fabrics' && movement.materialId) {
        const material = await ctx.db.get('fabrics', movement.materialId as Id<'fabrics'>);
        return { ...movement, material };
      } else if (movement.materialType === 'materials' && movement.materialId) {
        const material = await ctx.db.get('materials', movement.materialId as Id<'materials'>);
        return { ...movement, material };
      }
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