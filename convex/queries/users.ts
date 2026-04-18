import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation } from "../_generated/server";
import { v } from "convex/values";

export const updateCurrentUser = mutation({
  args: {
    name:      v.optional(v.string()),
    lastName:  v.optional(v.string()),
    phone:     v.optional(v.string()),
    birthday:  v.optional(v.string()),
    workHours: v.optional(v.number()),
    startDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Not authenticated');
    await ctx.db.patch(userId, args);
  },
});