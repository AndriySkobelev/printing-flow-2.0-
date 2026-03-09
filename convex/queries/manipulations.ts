import { query, mutation, QueryCtx } from "../_generated/server";

export const removeDuplicate = mutation({
  handler: async (ctx) => {
    const fabrics = await ctx.db.query('fabrics').filter(q => q.eq(q.field('fabricName'), 'Трьохнитка (без флісу)')).collect();
    const uniqueFabrics = new Map();
    for (const fabric of fabrics) {
      if (uniqueFabrics.has(fabric.color)) {
        // This is a duplicate — delete it
        await ctx.db.delete(fabric._id);
      } else {
        uniqueFabrics.set(fabric.color, true);
      }
    }
  }
})