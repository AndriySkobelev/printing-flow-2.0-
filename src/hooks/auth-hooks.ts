import { useContext } from "react";
import { AuthContext } from "@/contexts/auth";

export const useAuth = () => {
  const auth = useContext(AuthContext)
  return auth;
}