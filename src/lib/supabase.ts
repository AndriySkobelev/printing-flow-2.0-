import { createClient } from '@supabase/supabase-js';

const supabaseBaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseBaseUrl, supabaseAnonKey); 