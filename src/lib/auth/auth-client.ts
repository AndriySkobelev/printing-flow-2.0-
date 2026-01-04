import { createAuthClient } from "better-auth/react"
import { jwtClient } from "better-auth/client/plugins"

export const { signOut, signUp, useSession, signIn, getSession } = createAuthClient({
  baseURL: "http://localhost:3000", // The base URL of your auth server
  plugins: [jwtClient()],
})
