import { convexAuth } from "@convex-dev/auth/server";
import Google from "@auth/core/providers/google";
import { mutation, internalMutation, query } from "./_generated/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Google],
});

export const authMutation = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated call to mutation");
    }
    console.log('user', identity)
    return null;
  }
})

export const authMutation2 = internalMutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated call to mutation");
    }
    console.log('user', identity)
    return null;
  }
})