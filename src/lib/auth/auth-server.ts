import { createServerFn, createServerOnlyFn } from '@tanstack/react-start';
import { useSession } from '@tanstack/react-start/server';
import argon2 from 'argon2';
import { eq } from 'drizzle-orm';
import { createLocalJWKSet, decodeJwt, jwtVerify,  } from 'jose';
import { nowTimestamp } from '../utils';
import { auth } from './auth';
import { useAppSession } from './auth-middleware';
import type {UserTableType} from '@/db/schemas/auth-schema';
import { db } from '@/db';
import { userTable } from '@/db/schemas/auth-schema';

const hashPassword = async (password: string) => {
  const hash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 2 ** 12,
    timeCost: 3,
    parallelism: 1
  });
  return hash;
}

export const registerUser = createServerFn().handler(async ({ data }: { data: any }) => {
  const existingUser = await db.select().from(userTable).where(eq(userTable.email, data.email));
  if (existingUser.length > 0) {
    throw new Error('User already exists')
  }

  const hash = await hashPassword(data?.password)

  const [newUser] = await db.insert(userTable).values({
    name: data.name,
    email: data.email,
    emailVerified: false,
    passHash: hash,
    image: null,
  }).returning();

  if (!newUser as any) {
    return { error: 'Помилка створення користувача' };
  }

  return newUser
});

export type GenerateTokenType = {
  id: string,
  kid: string,
  time: number
}

export const generateCookieToken = async ({ id, time, kid }: GenerateTokenType) => {
  const tokenRes = await auth.api.signJWT({
    body: {
      payload: {
        sub: id,
        kid: kid,
        exp: nowTimestamp + time,
      }
    }
  })
  return tokenRes.token;
}

export const signIn = createServerFn({ method: 'POST' }).handler(async ({ data }:{ data: any }) => {
  console.log("🚀 ~ data:", data)
  const { email, password }: any = data;
  const getUser: UserTableType | null | any = await db.select().from(userTable).where(eq(userTable.email, email))
  const user = getUser[0];
  if (!user) {
    return {
      status: 400,
      statusText: `Didn't found user with email: ${email}`
    }
  } 
  const verify = await argon2.verify(user?.passHash as string, password);
  if (verify) {
    const refreshToken = await generateCookieToken({ id: user?.id, time: 60 * 60 * 24 * 30, kid: 'refresh_LB'});
    const headers = new Headers();
    headers.append('Set-Cookie', `refresh_token=${refreshToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=2592000`)
    
    const session = await useAppSession()
    await session.update({
      userId: user.id,
      role: user.role
    })
  
    return new Response(user, { status: 200, statusText: 'OK', headers })
  }
  return {
    status: 401,
    statusText: 'Password is wrong!'
  }
})

export const serverSinIn = createServerOnlyFn((data) => {
  return signIn({ data })
})