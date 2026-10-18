// KEY define onde o identificador opaco do visitante é salvo.
const KEY = "kurio-guest-id";
// fallback mantém uma identidade em memória quando o navegador bloqueia o armazenamento.
let fallback: string | undefined;

/** Identidade opaca do visitante; o token da conta sempre tem prioridade na API. */
export function guestIdentity() {
  try {
    // stored é a identidade recuperada do navegador, validada antes de reutilização.
    const stored = localStorage.getItem(KEY);
    if (stored && /^[a-zA-Z0-9-]{8,80}$/.test(stored)) return stored;
    // id é a nova identidade aleatória que será persistida para o visitante.
    const id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
    return id;
  } catch {
    fallback ??= crypto.randomUUID();
    return fallback;
  }
}
