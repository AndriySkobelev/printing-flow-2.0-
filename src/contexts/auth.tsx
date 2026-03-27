import { useAuthActions } from "@convex-dev/auth/react";
import { RouterProvider } from '@tanstack/react-router'
import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { api } from "convex/_generated/api";
import { ConvexReactClient } from "convex/react";
import { has } from "ramda";

import { createContext, useState, useEffect } from "react";

export const AuthContext = createContext<any>({});

type ProviderType = 'google' | 'github'

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { signIn, signOut } = useAuthActions();
  const [userState, setUserState] = useState<AuthPropsType | null>({
    user: null,
    isAuntificated: false
  });
  const { data: userData } = useQuery(convexQuery(api.auth.authQuery));
  console.log("🚀 ~ AuthContext ~ userData:", userData)

  const oauthSinIn = (provider: ProviderType) => signIn(provider);
  const oauthSinOut = () => signOut();

  const value = { oauthSinIn, oauthSinOut, ...userState, user: userData };
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export type AuthPropsType = {
  user: any,
  isAuntificated: boolean,
}
