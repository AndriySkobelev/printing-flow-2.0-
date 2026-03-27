import { convexAuth } from "@convex-dev/auth/server";
import Google from "@auth/core/providers/google";
import { mutation, internalMutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Google],
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

export const authMutation = query({
  handler: async (ctx) => {
    const currTimeStamp = new Date().valueOf();
    const identity = await ctx.auth.getUserIdentity();
    console.log("🚀 ~ identity:", identity)
    if (identity === null) {
      console.log('Unauthorized')
      return {
        code: 400,
        message: 'Unauthorized'
      }
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

