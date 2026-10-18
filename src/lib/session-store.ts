import { useSyncExternalStore } from "react";

// TOKEN_KEY define a chave do token opaco persistido no navegador.
const TOKEN_KEY = "kurio-session-token";
// listeners reúne as assinaturas que devem ser avisadas quando o token muda.
const listeners = new Set<() => void>();
// expired distingue vencimento de sessão de uma saída voluntária, permitindo mostrar o aviso correto.
let expired = false;

/** O token opaco identifica somente a sessão fictícia; senhas não passam por este armazenamento. */
export function getSessionToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

// Atualiza o token persistido e notifica os observadores da mesma aba.
export function setSessionToken(token: string | null, didExpire = false) {
  expired = didExpire;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
  listeners.forEach(listener => listener());
}

// Registra um observador da sessão e devolve a função que remove suas assinaturas.
function subscribe(listener: () => void) {
  listeners.add(listener);
  // Outra aba não pode manter na tela os dados de uma sessão encerrada.
  const onStorage = (event: StorageEvent) => { if (event.key === TOKEN_KEY) listener(); };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(listener); window.removeEventListener("storage", onStorage); };
}

// Sincroniza o token persistido com as renderizações do React.
export function useSessionToken() { return useSyncExternalStore(subscribe, getSessionToken, () => null); }
// Informa se a última remoção de token ocorreu por expiração.
export function sessionDidExpire() { return expired; }
