import { api } from "./http";
import type { AuthResponse, LoginInput, RegisterInput, SessionResponse } from "./contracts";

/** Operações de conta usam o mesmo cliente e os mesmos erros da API do catálogo. */
export const authApi = {
  // input contém as credenciais fictícias; a resposta é necessária antes de aceitar a nova sessão.
  login: async (input: LoginInput) => (await api.post<AuthResponse>("/auth/login", input)).data,
  register: async (input: RegisterInput) => (await api.post<AuthResponse>("/auth/register", input)).data,
  session: async (signal: AbortSignal) => (await api.get<SessionResponse>("/auth/session", { signal })).data,
  // A interface limpa a sessão somente após confirmar a saída pela API.
  logout: async () => { await api.post("/auth/logout"); },
};
