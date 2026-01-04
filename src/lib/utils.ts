import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge';
import { useSession } from '@tanstack/react-start/server';
import type {ClassValue} from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const nowTimestamp = Math.floor(Date.now() / 1000);

export const redirectTo = ({
  pathTo,
  status,
  request,
  context,
  pathname,
}:{
  request?: any,
  context?: any,
  status: number,
  pathTo: string,
  pathname?: string,
}) => {
  return {
    request,
    context,
    pathname,
    response: new Response(null, {
      status,
      headers: {
        Location: pathTo,
      },
    }),
  }
}

export function parseCookies(cookieHeader?: string) {
  console.log("🚀 ~ parseCookies ~ cookieHeader:", cookieHeader)
  if (!cookieHeader) return {}
  return Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [key, value] = c.trim().split('=')
      return [key, value]
    })
  )
}
