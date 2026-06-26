import { query, mutation, QueryCtx } from "../_generated/server";

export const removeDuplicate = mutation({
  handler: async (ctx) => {
    const fabrics = await ctx.db.query('fabrics').filter(q => q.eq(q.field('name'), 'Трьохнитка (без флісу)')).collect();
    const uniqueFabrics = new Map();
    for (const fabric of fabrics) {
      if (uniqueFabrics.has(fabric)) {
        // This is a duplicate — delete it
        await ctx.db.delete(fabric._id);
      } else {
        uniqueFabrics.set(fabric, true);
      }
    }
  }
})