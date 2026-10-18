import { http, HttpResponse } from "msw";
import { resetOrders } from "./order-handlers.ts";
import { resetAccountData } from "./account-handlers.ts";
import { delay } from "msw";
import type { AuthResponse, SessionUser } from "../api/contracts.ts";
import { resetCatalog, scenarioFor } from "./catalog-handlers.ts";
import { mergeVisitorCart, resetCarts } from "./cart-database.ts";

// Account acrescenta salt e hash somente ao banco; a resposta pública usa SessionUser.
type Account = SessionUser & { salt: string; passwordHash: string };
// Session vincula o token opaco à conta e ao instante de vencimento.
type Session = { token: string; userId: string; expiresAt: number };
// Database reúne contas e sessões para que todas as rotas observem o mesmo estado.
type Database = { accounts: Account[]; sessions: Session[] };
// DATABASE_KEY define a chave exclusiva usada para persistir o banco deste recurso simulado.
const DATABASE_KEY = "kurio-mock-auth-v1";
// SESSION_DURATION define a validade da sessão fictícia em milissegundos: trinta minutos.
const SESSION_DURATION = 30 * 60_000;
// database mantém o banco de contas e sessões em memória, restaurado do armazenamento na simulação.
let database: Database | undefined;
// initialization compartilha a inicialização assíncrona para impedir a criação simultânea de bancos diferentes.
let initialization: Promise<Database> | undefined;

/** Persistência pertence à simulação da API; credenciais em claro nunca são gravadas. */
function persist() {
  if (typeof localStorage !== "undefined") localStorage.setItem(DATABASE_KEY, JSON.stringify(database));
}

// Deriva um hash da senha com PBKDF2 e salt; o texto original não é persistido.
async function passwordHash(password: string, salt: string) {
  // key é a chave criptográfica derivável importada da senha para executar PBKDF2.
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  // bits contém os bits derivados de PBKDF2, convertidos depois para um hash hexadecimal.
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: new TextEncoder().encode(salt), iterations: 100_000, hash: "SHA-256" }, key, 256);
  return Array.from(new Uint8Array(bits), byte => byte.toString(16).padStart(2, "0")).join("");
}

// Cria a conta simulada com identificador, dados públicos e hash da credencial.
async function createAccount(id: string, username: string, email: string, password: string): Promise<Account> {
  // salt é o valor aleatório por conta que impede hashes iguais para senhas iguais.
  const salt = crypto.randomUUID();
  return { id, username, email, salt, passwordHash: await passwordHash(password, salt) };
}

/** Dois usuários fictícios permitem avaliar conflito, logout e troca de conta. */
async function getDatabase(): Promise<Database> {
  if (database) return database;
  initialization ??= (async () => {
    try {
      // saved representa os dados recuperados do armazenamento, que precisam de validação antes do uso.
      const saved = typeof localStorage !== "undefined" ? JSON.parse(localStorage.getItem(DATABASE_KEY) ?? "null") : null;
      if (saved && Array.isArray(saved.accounts) && Array.isArray(saved.sessions)) return database = saved;
    } catch { /* Dados corrompidos reiniciam somente o banco simulado. */ }
    database = { accounts: await Promise.all([
      createAccount("collector-nova", "Nova", "nova@example.com", "Kurio123!"),
      createAccount("collector-sage", "Sage", "sage@example.com", "Kurio123!"),
    ]), sessions: [] };
    persist();
    return database;
  })();
  return initialization;
}

// error padroniza uma resposta HTTP de falha com código, mensagem e status.
const error = (status: number, code: string, message: string, fields?: Record<string, string>) => HttpResponse.json({ error: { code, message, fields } }, { status });
// publicUser seleciona somente os dados públicos da conta, excluindo senha, hash e salt.
const publicUser = ({ id, username, email }: Account): SessionUser => ({ id, username, email });

/** Valida credenciais antes de alterar a conta; nenhuma senha em claro é persistida. */
export async function updateAccount(id: string, username: string, email: string, password?: { current: string; next: string }): Promise<SessionUser | { fields: Record<string, string> }> {
  // db é o banco de contas e sessões inicializado antes de validar a alteração cadastral.
  const db = await getDatabase();
  // account seleciona a conta autenticada que receberá novos dados e, quando solicitado, um novo hash de senha.
  const account = db.accounts.find(item => item.id === id)!;
  // normalizedEmail remove espaços externos e normaliza maiúsculas para detectar conflitos entre contas.
  const normalizedEmail = email.trim().toLowerCase();
  if (db.accounts.some(item => item.id !== id && item.email === normalizedEmail)) return { fields: { email: "Este e-mail já está cadastrado." } };
  if (password) {
    if (typeof password.current !== "string" || await passwordHash(password.current, account.salt) !== account.passwordHash) return { fields: { "password-current": "A senha atual está incorreta." } };
    if (typeof password.next !== "string" || password.next.length < 8) return { fields: { "password-next": "Use ao menos 8 caracteres." } };
    // salt renova o valor aleatório da conta antes de derivar o hash da nova senha.
    const salt = crypto.randomUUID();
    account.passwordHash = await passwordHash(password.next, salt);
    account.salt = salt;
  }
  account.username = username.trim(); account.email = normalizedEmail;
  persist();
  return publicUser(account);
}
// tokenFor extrai o token do cabeçalho Authorization para resolver a sessão da requisição.
const tokenFor = (request: Request) => request.headers.get("authorization")?.replace(/^Bearer /, "");

// Simula atraso, indisponibilidade ou falha de conexão antes de processar a autenticação.
async function failureFor(request: Request) {
  await delay(scenarioFor(request) === "slow" ? 1800 : 150);
  if (scenarioFor(request) === "offline") return HttpResponse.error();
  if (scenarioFor(request) === "error") return error(503, "TEMPORARY_UNAVAILABLE", "Serviço indisponível. Tente novamente.");
}

// Mescla o visitante, cria o token e devolve somente os dados públicos da sessão.
function beginSession(db: Database, account: Account, request: Request) {
  mergeVisitorCart(account.id, request.headers.get("x-kurio-guest"));
  // session vincula o token à conta e ao vencimento, seja ao criar ou ao consultar a sessão.
  const session = { token: crypto.randomUUID(), userId: account.id, expiresAt: Date.now() + SESSION_DURATION };
  db.sessions.push(session);
  persist();
  return HttpResponse.json<AuthResponse>({ token: session.token, expiresAt: session.expiresAt, user: publicUser(account) });
}

/** Recursos privados resolvem a identidade pelo token, nunca por um userId enviado na URL. */
export async function authenticatedUser(request: Request): Promise<SessionUser | null> {
  // db acessa o banco em memória da simulação, compartilhado pelos handlers deste recurso.
  const db = await getDatabase();
  // session vincula o token à conta e ao vencimento, seja ao criar ou ao consultar a sessão.
  const session = db.sessions.find(item => item.token === tokenFor(request));
  // forcedExpiry ativa o cenário de sessão expirada sem depender da espera pelo vencimento real.
  const forcedExpiry = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("mockScenario") === "session-expired";
  if (!session || session.expiresAt <= Date.now() || forcedExpiry) return null;
  // account representa a conta encontrada ou criada no banco simulado.
  const account = db.accounts.find(item => item.id === session.userId);
  return account ? publicUser(account) : null;
}

/** Todas as operações de conta passam por HTTP, inclusive expiração reproduzível. */
// authHandlers registra as rotas simuladas de cadastro, login, consulta, logout, expiração e reset.
export const authHandlers = [
  // Valida o cadastro, trata conflito de e-mail e cria uma sessão fictícia para a nova conta.
  http.post("*/api/auth/register", async ({ request }) => {
    // failure contém uma eventual falha simulada; quando presente, interrompe a operação antes de alterar dados.
    const failure = await failureFor(request); if (failure) return failure;
    // input contém os dados recebidos pela requisição; seus campos são validados antes da gravação.
    const input = await request.json() as Record<string, unknown>;
    // username contém o nome de usuário do formulário ou da requisição, sem espaços externos quando normalizado.
    const username = typeof input.username === "string" ? input.username.trim() : "";
    // email guarda o endereço informado; na API ele é normalizado para comparação de contas.
    const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
    // password mantém a senha apenas durante a validação ou derivação do hash; nunca é gravada em claro.
    const password = typeof input.password === "string" ? input.password : "";
    // fields associa cada campo inválido à mensagem que o formulário deve apresentar.
    const fields: Record<string, string> = {};
    if (username.length < 2 || username.length > 50) fields.username = "Use um nome entre 2 e 50 caracteres.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fields.email = "Informe um e-mail válido.";
    if (password.length < 8 || password.length > 128) fields.password = "Use uma senha entre 8 e 128 caracteres.";
    if (Object.keys(fields).length) return error(422, "VALIDATION_ERROR", "Revise os campos indicados.", fields);
    // db acessa o banco em memória da simulação, compartilhado pelos handlers deste recurso.
    const db = await getDatabase();
    if (db.accounts.some(account => account.email === email)) return error(409, "EMAIL_CONFLICT", "Este e-mail já está cadastrado.", { email: "Este e-mail já está cadastrado." });
    // account representa a conta encontrada ou criada no banco simulado.
    const account = await createAccount(crypto.randomUUID(), username, email, password);
    // Verifica novamente após a derivação assíncrona para impedir duplicação em requisições concorrentes.
    if (db.accounts.some(item => item.email === email)) return error(409, "EMAIL_CONFLICT", "Este e-mail já está cadastrado.");
    db.accounts.push(account);
    return beginSession(db, account, request);
  }),
  // Confere as credenciais fictícias recebidas e devolve uma sessão para a conta correspondente.
  http.post("*/api/auth/login", async ({ request }) => {
    // failure contém uma eventual falha simulada; quando presente, interrompe a operação antes de alterar dados.
    const failure = await failureFor(request); if (failure) return failure;
    // input contém os dados recebidos pela requisição; seus campos são validados antes da gravação.
    const input = await request.json() as Record<string, unknown>;
    // db acessa o banco em memória da simulação, compartilhado pelos handlers deste recurso.
    const db = await getDatabase();
    // account representa a conta encontrada ou criada no banco simulado.
    const account = db.accounts.find(item => item.email === String(input.email ?? "").trim().toLowerCase());
    if (!account || typeof input.password !== "string" || await passwordHash(input.password, account.salt) !== account.passwordHash) return error(401, "INVALID_CREDENTIALS", "E-mail ou senha incorretos.");
    return beginSession(db, account, request);
  }),
  // Recupera a identidade pública e o vencimento da sessão ou informa sua expiração.
  http.get("*/api/auth/session", async ({ request }) => {
    // failure contém uma eventual falha simulada; quando presente, interrompe a operação antes de alterar dados.
    const failure = await failureFor(request); if (failure) return failure;
    // db acessa o banco em memória da simulação, compartilhado pelos handlers deste recurso.
    const db = await getDatabase();
    // session vincula o token à conta e ao vencimento, seja ao criar ou ao consultar a sessão.
    const session = db.sessions.find(item => item.token === tokenFor(request));
    // forcedExpiry ativa o cenário de sessão expirada sem depender da espera pelo vencimento real.
    const forcedExpiry = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("mockScenario") === "session-expired";
    if (!session || session.expiresAt <= Date.now() || forcedExpiry) return error(401, "SESSION_EXPIRED", "Sua sessão expirou. Entre novamente para continuar.");
    // account representa a conta encontrada ou criada no banco simulado.
    const account = db.accounts.find(item => item.id === session.userId);
    return account ? HttpResponse.json({ user: publicUser(account), expiresAt: session.expiresAt }) : error(401, "SESSION_EXPIRED", "Sessão inválida.");
  }),
  // Invalida o token apresentado para impedir que a mesma sessão continue acessando recursos privados.
  http.post("*/api/auth/logout", async ({ request }) => {
    // failure contém uma eventual falha simulada; quando presente, interrompe a operação antes de alterar dados.
    const failure = await failureFor(request); if (failure) return failure;
    // db acessa o banco em memória da simulação, compartilhado pelos handlers deste recurso.
    const db = await getDatabase();
    db.sessions = db.sessions.filter(item => item.token !== tokenFor(request));
    persist();
    return new HttpResponse(null, { status: 204 });
  }),
  // Permite reproduzir o vencimento da sessão pelo mesmo transporte usado pela aplicação.
  http.post("*/api/auth/expire", async ({ request }) => {
    // db acessa o banco em memória da simulação, compartilhado pelos handlers deste recurso.
    const db = await getDatabase();
    // session vincula o token à conta e ao vencimento, seja ao criar ou ao consultar a sessão.
    const session = db.sessions.find(item => item.token === tokenFor(request));
    if (!session) return error(401, "SESSION_EXPIRED", "Sessão inválida.");
    session.expiresAt = 0;
    persist();
    return new HttpResponse(null, { status: 204 });
  }),
  // Restaura integralmente as fixtures e remove somente os dados locais pertencentes à demonstração Kurio.
  http.post("*/api/mock/reset", async () => {
    database = undefined;
    initialization = undefined;
    if (typeof localStorage !== "undefined") {
      // O reset da demonstração também remove os recursos privados e o token antigo.
      // keys lista as chaves existentes antes do reset para permitir removê-las com segurança durante a iteração.
      const keys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index));
      // key identifica uma entrada de armazenamento; o prefixo Kurio evita remover dados de outras aplicações.
      for (const key of keys) {
          if (key?.startsWith("kurio-")) localStorage.removeItem(key);
      }
        // key identifica uma entrada de armazenamento; o prefixo Kurio evita remover dados de outras aplicações.
        for (const key of Object.keys(sessionStorage)) if (key.startsWith("kurio-")) sessionStorage.removeItem(key);
    }
    await getDatabase();
    resetCatalog();
    resetCarts();
      resetOrders();
      resetAccountData();
    return new HttpResponse(null, { status: 204 });
  }),
];
