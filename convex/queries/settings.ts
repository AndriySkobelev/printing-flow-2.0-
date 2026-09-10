import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

// systemSettings is a singleton table — at most one document ever exists,
// created lazily on first write. Reads fall back to defaults before that.

export const getSystemSettings = query({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.db.query('systemSettings').first();
    return {
      allowUnconfiguredProducts: settings?.allowUnconfiguredProducts ?? false,
    };
  },
});

export const updateSystemSettings = mutation({
  args: {
    allowUnconfiguredProducts: v.boolean(),
  },
  handler: async (ctx, { allowUnconfiguredProducts }) => {
    const existing = await ctx.db.query('systemSettings').first();
    if (existing) {
      await ctx.db.patch(existing._id, { allowUnconfiguredProducts });
    } else {
      await ctx.db.insert('systemSettings', { allowUnconfiguredProducts });
    }
  },
});
