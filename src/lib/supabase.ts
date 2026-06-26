import { createClient } from '@supabase/supabase-js';
import { getCookies, setCookie } from '@tanstack/react-start/server';

const supabaseBaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const getSupabaseServerClient = createClient(
  supabaseBaseUrl,
  supabaseAnonKey,
  {
    cookies: {
      getAll() {
        return Object.entries(getCookies()).map(([name, value]) => ({
          name,
          value,
        }))
      },
      setAll(cookies: any) {
        cookies.forEach((cookie: any) => {
          setCookie(cookie.name, cookie.value)
        })
      },
    },
  } as any); 