import { useConvexAuth } from 'convex/react'
import { Navigate, RouterProvider, useRouter } from '@tanstack/react-router'
import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { api } from "convex/_generated/api";
import { createContext, Suspense, useContext, useState, useEffect } from "react";

export const AuthContext = createContext<any>({});

type ProviderType = 'google' | 'github'

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useConvexAuth();
  console.log("🚀 ~ AuthProvider ~ isLoading:", isLoading)
  console.log("🚀 ~ AuthProvider ~ isAuthenticated:", isAuthenticated)
  // const { navigate } = useRouter();


  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log('navigate to login')
      // navigate({ to: '/login' })
    }
  }, [isLoading])

  const value = { isAuthenticated };

  return (
    <AuthContext.Provider value={value}>
      <Suspense fallback={<div>Loading...</div>}>
        {children}
      </Suspense>
    </AuthContext.Provider>
  );
};

export type AuthPropsType = {
  user: any,
  isAuntificated: boolean,
}
