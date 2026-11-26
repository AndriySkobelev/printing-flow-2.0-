import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requirePage, requirePermission } from "./roles";
import {
  DEFAULT_PRINT_BASE_LARGE,
  DEFAULT_PRINT_BASE_STANDARD,
  canEditPrintPricing,
} from "../lib/printPricing";

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
    await requirePermission(ctx, '/app/settings', 'edit');
    const existing = await ctx.db.query('systemSettings').first();
    if (existing) {
      await ctx.db.patch(existing._id, { allowUnconfiguredProducts });
    } else {
      await ctx.db.insert('systemSettings', { allowUnconfiguredProducts });
    }
  },
});

export const getPrintPricing = query({
  args: {},
  handler: async (ctx) => {
    await requirePage(ctx, '/app/order-processing');
    const settings = await ctx.db.query('systemSettings').first();
    return {
      standard: settings?.printBaseStandard ?? DEFAULT_PRINT_BASE_STANDARD,
      large:    settings?.printBaseLarge    ?? DEFAULT_PRINT_BASE_LARGE,
    };
  },
});

export const updatePrintPricing = mutation({
  args: {
    standard: v.number(),
    large:    v.number(),
  },
  handler: async (ctx, { standard, large }) => {
    const me = await requirePage(ctx, '/app/order-processing');
    if (!canEditPrintPricing(me.role)) throw new Error('Недостатньо прав для цієї дії');
    if (!(standard >= 0) || !(large >= 0)) throw new Error('Ціна не може бути відʼємною');
    const patch = { printBaseStandard: standard, printBaseLarge: large };
    const existing = await ctx.db.query('systemSettings').first();
    if (existing) {
      await ctx.db.patch(existing._id, patch);
    } else {
      await ctx.db.insert('systemSettings', { allowUnconfiguredProducts: false, ...patch });
    }
  },
});
