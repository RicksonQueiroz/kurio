import { useEffect, useRef, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/api/auth";
import type { AuthResponse, LoginInput, RegisterInput, SessionResponse } from "@/api/contracts";
import { useSessionToken, setSessionToken } from "@/lib/session-store";
import { AuthContext } from "./auth-store";

/** Recupera a sessão pela rede e remove consultas privadas ao trocar ou encerrar a conta. */
export function AuthProvider({ children }: { children: ReactNode }) {
  // token identifica a sessão fictícia atual; não contém a senha do usuário.
  const token = useSessionToken();
  // client acessa o cache compartilhado do TanStack Query para cancelar, consultar ou atualizar respostas.
  const client = useQueryClient();
  // previousToken preserva o token observado anteriormente para detectar encerramento ou troca de sessão.
  const previousToken = useRef(token);
  // previousUser guarda a identidade anterior para limpar apenas seus dados privados.
  const previousUser = useRef<string | undefined>(undefined);
  // session reúne os dados e estados da consulta que recupera e revalida a sessão pela API.
  const session = useQuery({
    queryKey: ["session", token], queryFn: ({ signal }) => authApi.session(signal),
    enabled: !!token, retry: false, staleTime: 0,
    refetchOnWindowFocus: true, refetchInterval: token ? 30_000 : false,
  });

  // Ao trocar o token, cancela respostas antigas e remove consultas privadas pertencentes à sessão anterior.
  useEffect(() => {
    if (previousToken.current && previousToken.current !== token) {
      // Inclui respostas em trânsito; os queryFns encaminham o AbortSignal ao Axios.
      // oldUser identifica a conta anterior cujo cache precisa ser removido.
      const oldUser = previousUser.current;
      // belongsToPreviousSession seleciona somente consultas antigas, sem cancelar as da nova conta ou do visitante.
      const belongsToPreviousSession = (query: { queryKey: readonly unknown[] }) => query.queryKey[0] === "session"
        ? query.queryKey[1] !== token : !!oldUser && query.queryKey[1] === oldUser;
      void client.cancelQueries({ predicate: belongsToPreviousSession });
      client.removeQueries({ predicate: belongsToPreviousSession });
    }
    previousToken.current = token;
    previousUser.current = token ? session.data?.user.id : undefined;
  }, [client, token, session.data?.user.id]);

  // O vencimento também é observado sem depender de uma nova chamada ou do polling.
  useEffect(() => {
    if (!token || !session.data) return;
    // timer agenda o encerramento local no instante de vencimento informado pela API.
    const timer = window.setTimeout(() => setSessionToken(null, true), Math.max(0, session.data.expiresAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [token, session.data]);

  // acceptSession recebe a resposta confirmada da API, limpa o cache anterior e instala a nova sessão.
  async function acceptSession(result: AuthResponse) {
    await client.cancelQueries();
    client.clear();
    client.setQueryData<SessionResponse>(["session", result.token], { user: result.user, expiresAt: result.expiresAt });
    setSessionToken(result.token);
  }
  // login coordena a mutation de entrada e a aceitação da nova sessão.
  const login = useMutation({ mutationFn: authApi.login, onSuccess: acceptSession });
  // register coordena a mutation de cadastro e a aceitação da nova sessão.
  const register = useMutation({ mutationFn: authApi.register, onSuccess: acceptSession });
  // logout coordena a saída pela API e a limpeza do cache e do rascunho da conta.
  const logout = useMutation({
    mutationFn: authApi.logout,
    onSuccess: async () => {
      await client.cancelQueries();
      client.clear();
      // Logout explícito descarta rascunhos; expiração preserva-os para a mesma conta.
      if (session.data) {
        // section identifica cada rascunho do checkout removido no logout explícito desta conta.
        for (const section of ["form", "selection"]) sessionStorage.removeItem(`kurio-checkout:${session.data.user.id}:${section}`);
      }
      setSessionToken(null);
    },
  });

  return <AuthContext.Provider value={{
    user: token ? session.data?.user ?? null : null,
    isLoading: !!token && session.isPending,
    error: token ? session.error : null,
    isSubmitting: login.isPending || register.isPending || logout.isPending,
    login: async (input: LoginInput) => { await login.mutateAsync(input); },
    register: async (input: RegisterInput) => { await register.mutateAsync(input); },
    logout: async () => { await logout.mutateAsync(); },
    retry: () => { void session.refetch(); },
  }}>{children}</AuthContext.Provider>;
}
