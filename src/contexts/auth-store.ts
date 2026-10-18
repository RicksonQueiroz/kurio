import { createContext, useContext } from "react";
import type { LoginInput, RegisterInput, SessionUser } from "@/api/contracts";

// AuthState define a identidade pública, os estados de sessão e as operações oferecidas pelo provedor.
export type AuthState = {
  user: SessionUser | null;
  isLoading: boolean;
  error: unknown;
  isSubmitting: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  retry: () => void;
};
// AuthContext compartilha identidade e operações de autenticação; null indica ausência do provedor.
export const AuthContext = createContext<AuthState | null>(null);
// useAuth entrega o contexto da sessão e sinaliza uso incorreto fora de AuthProvider.
export function useAuth() {
  // context é a instância de autenticação encontrada na árvore de provedores.
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth requer AuthProvider.");
  return context;
}
