import { createServerFn } from "@tanstack/react-start";
import { getSupabaseServerClient } from "@/lib/supabase";
import { z } from "zod"

export const UserMetaSchema = z.object({
  username: z.string().min(3).max(20),
})

export type UserMeta = z.infer<typeof UserMetaSchema>
export type AuthState =
  | {
      isAuthenticated: false
    }
  | {
      isAuthenticated: true
      user: User
    }

export type User = { email?: string; meta: UserMeta }

export const getUser = createServerFn()
  .handler(async () => {
    const supabase = getSupabaseServerClient;

    const { data } = await supabase.auth.getUser()

    if (!data.user) {
      return { isAuthenticated: false }
    }

    return {
      isAuthenticated: true,
      user: {
        email: data.user.email,
        meta: { username: data.user.user_metadata.username },
      },
    }
  })