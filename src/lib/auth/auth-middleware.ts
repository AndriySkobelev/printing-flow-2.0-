import { createMiddleware } from '@tanstack/react-start'
import { getSession, useSession } from '@tanstack/react-start/server';
import { createLocalJWKSet, decodeJwt, jwtVerify } from 'jose';
import { parseCookies, redirectTo } from '../utils'
import { generateCookieToken } from './auth-server';
import { auth } from './auth';
import type { JWTPayload } from 'jose'

type SessionData = {
  userId?: string
  role?: string,
}

export const useAppSession = () => {
  return useSession<SessionData>({
    // Session configuration
    name: 'pf-app-session',
    password: process.env.JWT_SECRET!, // At least 32 characters
    // Optional: customize cookie settings
    cookie: {
      secure: process.env.NODE_ENV === 'dev',
      sameSite: 'lax',
      httpOnly: true,
    },
  })
}

export const refreshAccessToken = async (refreshToken: string) => {
  try {
    const session = await useAppSession();
    const sessionData = session.data;
    console.log("🚀 ~ refreshAccessToken ~ refreshToken:", refreshToken)
    const decodeToken: JWTPayload = await decodeJwt(refreshToken);
    const accessToken = await generateCookieToken({ id: decodeToken.sub as string, time: 60, kid: 'access_LB'});
    console.log("NEW ACCESS TOKEN:", accessToken)

    session.update({
      ...sessionData,
      accessToken
    })
    return {
      status: 200,
      statusText: 'Access token was updated'
    }
  }catch(error: any) {
    console.log('REFRESH_ACCESS_TOKEN_ERROR:', error.message)
    return {
      status: 500,
      errorMessage: error.message
    }
  }
};

type VerifyResultType = {
  result: boolean,
  context: any,
  reason?: string
}

const verifyToken = async (token: string) => {
  try {
    const keys = await auth.api.getJwks();
    const localKeys = createLocalJWKSet(keys);
    const verify = await jwtVerify(token, localKeys);
    return {
      result: true,
      context: verify,
    }
  } catch(error: any) {
    return {
      result: false,
      context: error,
      reason: error?.code
    }
  }
}

const authServeMiddleware = createMiddleware({ type: 'function' }).server(async ({ request, pathname, context, next }: any) => {
  const session = await useAppSession();
  const { accessToken, refreshToken }: any = await session.data;
  console.log('       ')
  console.log("🚀 ~ refreshToken:", refreshToken)
  console.log('       ')
  console.log("🚀 ~ accessToken:", accessToken)
  console.log('       ')
  
  try {
    const verifyAccess: VerifyResultType = await verifyToken(accessToken);
    if (!verifyAccess.result) {
      console.log('       ')
      console.log('ERR_JWT_EXPIRED ----------> now verify refresh')
      console.log('       ')
      if (verifyAccess.reason === 'ERR_JWKS_NO_MATCHING_KEY' || verifyAccess.reason ===  'ERR_JWS_INVALID') {
        session.clear();

        return redirectTo({
          request: new Response(null, {
            status: 302,
            statusText: "Access token unexpected"
          }),
          pathname,
          context: {
            ...context,
            reason: 'ERR_JWKS_NO_MATCHING_KEY'
          },
          status: 302,
          pathTo: '/login'
        })
      }
      if (verifyAccess.reason === 'ERR_JWT_EXPIRED') {
        console.log('       ')
        console.log('ERR_JWT_EXPIRED ----------> now verify refresh')
        console.log('       ')
        const verifyRefresh: VerifyResultType = await verifyToken(refreshToken)
        if (verifyRefresh.result) {
          console.log('       ')
          console.log('REFRESH SUCCESS ----------> now refresh access')
          console.log('       ')
          const refresh = await refreshAccessToken(refreshToken)
          if (refresh.status === 200) {
            console.log('       ')
            console.log('ACCESS TOKEN ----------> UPDATED')
            console.log('       ')
            return next();
          }
          console.log('ACCESS FAILED ----------> now clear session')
          session.clear();

          return redirectTo({
            request,
            pathname,
            context: {
              ...context,
              reason: 'REFRESH_TOKEN update error',
              refresh_token: refreshToken, 
            },
            status: 302,
            pathTo: '/login'
          })
        }

        return redirectTo({
          request,
          pathname,
          context: {
            ...context,
            reason: 'ERR_JWT_REFRESH_EXPIRED'
          },
          status: 302,
          pathTo: '/login'
        })
      }
    }
    console.log('       ')
    console.log('ACCESS GOOD ----------> next()')
    console.log('       ')
    
    return next();
  }catch(error: any) {
    console.log('ACCESS_TOKEN_ERROR:', error)
    return redirectTo({
      request,
      pathname,
      context,
      status: 302,
      pathTo: '/login'
    })
  }
});

const authClientMiddleware = createMiddleware({ type: 'function' })
.middleware([authServeMiddleware])
.client(async ({ next }: any) => {
  const result = await next()
  if (result.context.tokenRefreshed) {
    console.log('Token was refreshed on server')
    // тут можна оновити локальний стейт або повторити запит
  }
  return result
})

export {
  authServeMiddleware,
  authClientMiddleware
}