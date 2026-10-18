import axios from "axios";
import type { ApiErrorResponse } from "./contracts.ts";
import { getSessionToken, setSessionToken } from "../lib/session-store";
import { guestIdentity } from "../lib/guest-identity";

/** Único cliente REST. O mesmo transporte funciona com MSW ou um endpoint configurado. */
export const api = axios.create({
  baseURL: import.meta.env?.VITE_API_URL ?? "/api",
  timeout: 10_000,
  headers: { Accept: "application/json" },
});

// A sessão acompanha todas as chamadas; respostas antigas nunca encerram uma sessão nova.
api.interceptors.request.use(config => {
  // config conserva a requisição Axios; os cabeçalhos acrescentam visitante e sessão sem enviar senhas.
  config.headers["x-kurio-guest"] = guestIdentity();
  // token identifica a sessão fictícia atual; não contém a senha do usuário.
  const token = getSessionToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
// response preserva respostas bem-sucedidas; error permite tratar 401 sem encerrar uma sessão mais recente.
api.interceptors.response.use(response => response, error => {
  if (axios.isAxiosError(error) && error.response?.status === 401 &&
      !["/auth/login", "/auth/register"].includes(error.config?.url ?? "")) {
    // requestToken é o token usado pela requisição que falhou; permite reconhecer respostas de uma sessão antiga.
    const requestToken = error.config?.headers.Authorization;
    // currentToken é o token que continua ativo agora; uma resposta antiga não deve encerrá-lo.
    const currentToken = getSessionToken();
    if (currentToken && requestToken === `Bearer ${currentToken}`) setSessionToken(null, true);
  }
  return Promise.reject(error);
});

// Converte erros do transporte em mensagens que podem ser apresentadas ao usuário.
export function apiErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    return error.response?.data?.error?.message ?? "Não foi possível conectar. Verifique a conexão e tente novamente.";
  }
  return "Não foi possível carregar os dados. Tente novamente.";
}
