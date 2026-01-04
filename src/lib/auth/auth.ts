import { betterAuth } from "better-auth";
import { jwt } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import {createLocalJWKSet, decodeJwt, jwtVerify } from 'jose'
import { reactStartCookies } from "better-auth/react-start";
import { createServerFn } from '@tanstack/react-start';
import { db } from '@/db';
import { userTable } from "@/db/schemas/auth-schema";


export const auth = betterAuth({
  emailAndPassword: { 
    enabled: true, 
  },
  plugins: [jwt(), reactStartCookies()],
});

export type AuthType = typeof auth;
