import { useConvexAuth } from 'convex/react'
import {memo} from 'react'
import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { api } from "convex/_generated/api";
import { createContext } from "react";

export const AuthContext = createContext<any>({});


export const AuthProvider = memo(({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { data } = useQuery({
    ...convexQuery(api.auth.getUser),
    enabled: !isLoading && isAuthenticated
  })
  
  const value = { isLoading, isAuthenticated, user: data };
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
});

export type AuthPropsType = {
  user: any,
  isAuntificated: boolean,
}
