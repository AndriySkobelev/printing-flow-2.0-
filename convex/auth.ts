import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import Google from "@auth/core/providers/google";
import { mutation, internalMutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Google],
  callbacks: {
    // One deployment serves several frontends (localhost, the Netlify dev
    // branch), so besides SITE_URL accept the origins listed in
    // AUTH_ALLOWED_ORIGINS (comma-separated).
    async redirect({ redirectTo }) {
      const siteUrl = process.env.SITE_URL!.replace(/\/$/, '')
      if (redirectTo.startsWith('/') || redirectTo.startsWith('?')) return `${siteUrl}${redirectTo}`
      const allowed = [siteUrl, ...(process.env.AUTH_ALLOWED_ORIGINS ?? '').split(',')]
        .map(o => o.trim().replace(/\/$/, ''))
        .filter(Boolean)
      const origin = new URL(redirectTo).origin
      if (!allowed.includes(origin)) throw new Error(`Invalid redirectTo origin: ${origin}`)
      return redirectTo
    },
    // A brand-new account has to be approved by a super_admin first.
    async afterUserCreatedOrUpdated(ctx, { userId, existingUserId }) {
      if (existingUserId) return
      await ctx.db.patch(userId, { isApproved: false })
    },
  },
  // callbacks: {
  //   async createOrUpdateUser(ctx, args) {
  //     if (args.existingUserId) {
  //       return args.existingUserId;
  //     }
  //     // if (args.existingUserId === null) {
  //     //   console.log("Пішов звідци бешкетник!!!")
  //     //   throw Error ("Пішов звідци бешкетник!!!")
  //     // }
  //     return ctx.db.insert("users", {
  //       email: args.profile.email,
  //       name: args.profile.name,
  //     });
  //   },
  // }
});

export const authQuery = query({
  handler: async (ctx) => {
    const currTimeStamp = new Date().valueOf();
    const identity = await ctx.auth.getUserIdentity();
    const user = await getAuthUserId(ctx);
    if (!identity) {
      console.log('Unauthorized')
      return null;
    }
    const { subject } = identity;
    const [userId, sessionId] = subject.split('|')
    const getSession = await ctx.db.get('authSessions', sessionId as Id<'authSessions'>);
    if (!getSession) {
      console.log('Session not found')
      return {
        code: 401,
        message: 'Session not found'
      }
    }
    const { expirationTime } = getSession;
    const isExpired = currTimeStamp > expirationTime;
    if (isExpired) {
      console.log('Token was expired.')
      return {
        code: 301,
        message: 'Token was expired.'
      }
    }
    const userData = await ctx.db.get('users', userId as Id<'users'>)
    console.log("🚀 ~ userData:", userData)
    if (!userData) {
      console.log('User not found/')
      return {
        code: 400,
        message: 'User not found/'
      }
    }
    return userData;
  }
})

export const getUser = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return;
    }
    const userData = ctx.db.get(userId)
    return userData;
  }
})

