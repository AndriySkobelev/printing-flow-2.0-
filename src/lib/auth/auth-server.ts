import { createServerFn } from '@tanstack/react-start';
import { getSupabaseServerClient } from '../supabase';

export const signupSupabaseFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: { email: string; password: string; redirectUrl?: string }) => d,
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient
    const { data: signupData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    })
    if (error) {
      return {
        error: true,
        message: error.message,
      }
    }

    // Redirect to the prev page stored in the "redirect" search param
    return { user: signupData.user }
  })

export const loginSupabaseFn = createServerFn({ method: 'POST' })
  .inputValidator((d: { email: string; password: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (error) {
      return {
        error: true,
        message: error.message,
      }
    }
})
