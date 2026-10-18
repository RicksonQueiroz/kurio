import { http, HttpResponse } from "msw";
import { delay } from "msw";
import { authenticatedUser, updateAccount } from "./auth-handlers.ts";
import { findCatalogNFT, scenarioFor } from "./catalog-handlers.ts";
import { emptyProfile, emptyWallet, readProfile, readWallets } from "../lib/accountStorage.ts";
import type { CollectorProfile, CollectorWallet, WalletSettings } from "../lib/accountStorage.ts";
import type { SessionUser } from "../api/contracts.ts";

// AccountData reúne perfil, carteiras, favoritos e conexão simulada de uma única conta.
type AccountData = { profile: CollectorProfile; wallets: WalletSettings; favorites: string[]; connection: { wallet: "primary" | "secondary"; network: string } | null };
// KEY é a chave de persistência do banco privado de dados dos colecionadores.
const KEY = "kurio-mock-account-data-v1";
// records guarda registros em memória indexados pelo identificador do usuário; undefined indica leitura ainda não realizada.
let records: Record<string, AccountData> | undefined;
// database restaura o banco privado quando necessário e descarta estruturas inválidas antes de atender às rotas.
function database() {
  if (!records) {
    try { records = typeof localStorage === "undefined" ? {} : JSON.parse(localStorage.getItem(KEY) ?? "{}"); }
    catch { records = {}; }
    if (!records || typeof records !== "object" || Array.isArray(records)) records = {};
  }
  return records;
}
// persist salva o banco atual apenas quando existe armazenamento local, permitindo os mesmos handlers no Node.
function persist() { if (typeof localStorage !== "undefined") localStorage.setItem(KEY, JSON.stringify(database())); }
// resetAccountData remove os registros privados simulados e persiste o cenário vazio para o reset completo.
export function resetAccountData() { records = {}; persist(); }
// accountData recebe a identidade validada e recupera ou inicializa somente o registro dessa conta.
export function accountData(user: SessionUser): AccountData {
  // db referencia o mapa de registros privados compartilhado entre os handlers de conta.
  const db = database();
  if (!db[user.id]) {
    // A migração fica no servidor simulado; as telas deixam de acessar o armazenamento.
    const profile = typeof localStorage === "undefined" ? { ...emptyProfile } : readProfile(user.id);
    // wallets restaura os cadastros antigos da conta ou inicia principal vazia e secundária ausente.
    const wallets = typeof localStorage === "undefined" ? { primary: { ...emptyWallet }, secondary: null } : readWallets(user.id);
    db[user.id] = { profile: { ...profile, username: profile.username || user.username, email: profile.email || user.email }, wallets, favorites: [], connection: null };
    persist();
  }
  return db[user.id];
}
// error cria respostas HTTP padronizadas com status, código, mensagem e erros opcionais por campo.
const error = (status: number, code: string, message: string, fields?: Record<string, string>) => HttpResponse.json({ error: { code, message, fields } }, { status });
// prepare aplica a condição de rede escolhida e resolve a sessão; uma Response encerra o handler com erro.
async function prepare(request: Request) {
  await delay(scenarioFor(request) === "slow" ? 1800 : 150);
  if (scenarioFor(request) === "offline") return HttpResponse.error();
  if (scenarioFor(request) === "error" || (scenarioFor(request) === "mutation-error" && request.method !== "GET")) return error(503, "TEMPORARY_UNAVAILABLE", "Não foi possível atualizar sua conta. Tente novamente.");
  return await authenticatedUser(request) ?? error(401, "SESSION_EXPIRED", "Entre novamente para acessar sua conta.");
}
// Os mesmos validadores são usados no cadastro e na conexão da carteira simulada.
export function walletErrors(wallet: CollectorWallet): Record<string, string> {
  // fields associa cada atributo inválido da carteira à mensagem que a interface deve vincular ao controle.
  const fields: Record<string, string> = {};
  // key percorre os atributos obrigatórios e associa campos inválidos às suas mensagens de correção.
  for (const key of Object.keys(emptyWallet) as (keyof CollectorWallet)[]) if (key !== "secondaryAddress" && (typeof wallet?.[key] !== "string" || !wallet[key].trim())) fields[key] = "Preencha este campo.";
  if (!["Ethereum", "Polygon", "Solana"].includes(wallet?.network)) fields.network = "Selecione uma rede válida.";
  if (!["WalletConnect", "MetaMask", "Coinbase Wallet"].includes(wallet?.provider)) fields.provider = "Selecione um provedor válido.";
  if (!/^\S+@\S+\.\S+$/.test(wallet?.email ?? "")) fields.email = "Informe um e-mail válido.";
  if (wallet?.network !== "Solana" && !/^0x[a-fA-F0-9]{40}$/.test(wallet?.address ?? "")) fields.address = "Informe um endereço 0x com 40 caracteres hexadecimais.";
  if (wallet?.network === "Solana" && !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(wallet?.address ?? "")) fields.address = "Informe um endereço Solana válido.";
  return fields;
}

// accountHandlers implementa recursos privados de perfil, carteiras, conexão e favoritos na camada de rede.
export const accountHandlers = [
  // Consulta o perfil da sessão; request fornece autorização e o cenário de rede.
  http.get("*/api/profile", async ({ request }) => {
    // user contém a identidade validada ou uma resposta de erro que deve ser devolvida imediatamente.
    const user = await prepare(request); return user instanceof Response ? user : HttpResponse.json(accountData(user).profile);
  }),
  // Valida dados, avatar e senha recebidos em request antes de atualizar o perfil da conta.
  http.patch("*/api/profile", async ({ request }) => {
    // user contém a identidade validada ou uma resposta de erro que impede a atualização do perfil.
    const user = await prepare(request); if (user instanceof Response) return user;
    // input contém os dados recebidos para atualizar o perfil e a eventual troca de senha.
    const input = await request.json() as { profile: CollectorProfile; password?: { current: string; next: string } };
    // profile seleciona o perfil enviado, antes de validar seus campos e persistir qualquer alteração.
    const profile = input?.profile;
    // fields acumula erros de dados pessoais e avatar, sem gravar parcialmente um perfil inválido.
    const fields: Record<string, string> = {};
    // key percorre os atributos obrigatórios e associa campos inválidos às suas mensagens de correção.
    for (const key of ["displayName", "username", "email", "ensName", "walletAlias"] as const) if (typeof profile?.[key] !== "string" || !profile[key].trim()) fields[key] = "Preencha este campo.";
    if (!/^\S+@\S+\.\S+$/.test(profile?.email ?? "")) fields.email = "Informe um e-mail válido.";
    if (profile?.avatar && (!/^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(profile.avatar) || profile.avatar.length > 2_800_000)) fields.avatar = "Selecione uma imagem raster de até 2 MB.";
    if (Object.keys(fields).length) return error(422, "VALIDATION_ERROR", "Confira os dados do perfil.", fields);
    // result contém a identidade pública atualizada ou erros de credenciais/conflito devolvidos pela validação da conta.
    const result = await updateAccount(user.id, profile.username, profile.email, input.password);
    if ("fields" in result) return error(422, "VALIDATION_ERROR", "Não foi possível atualizar o perfil.", result.fields);
    accountData(user).profile = Object.fromEntries(Object.keys(emptyProfile).map(key => [key, String(profile[key as keyof CollectorProfile] ?? "")])) as CollectorProfile;
    persist();
    return HttpResponse.json(accountData(user).profile);
  }),
  // Consulta os dois cadastros de carteira da conta autenticada.
  http.get("*/api/wallets", async ({ request }) => {
    // user resolve a sessão antes de consultar as carteiras privadas.
    const user = await prepare(request); return user instanceof Response ? user : HttpResponse.json(accountData(user).wallets);
  }),
  // Grava a seção indicada por params.slot somente depois de validar o cadastro recebido em request.
  http.put("*/api/wallets/:slot", async ({ request, params }) => {
    // user resolve a sessão antes de alterar uma das carteiras da conta.
    const user = await prepare(request); if (user instanceof Response) return user;
    if (!["primary", "secondary"].includes(String(params.slot))) return error(404, "WALLET_NOT_FOUND", "Carteira não encontrada.");
    // wallet contém o cadastro recebido para a seção principal ou secundária indicada na rota.
    const wallet = await request.json() as CollectorWallet;
    // fields contém os erros do cadastro e bloqueia sua gravação quando algum atributo é inválido.
    const fields = walletErrors(wallet);
    if (Object.keys(fields).length) return error(422, "VALIDATION_ERROR", "Confira os dados da carteira.", fields);
    accountData(user).wallets[params.slot as "primary" | "secondary"] = Object.fromEntries(Object.keys(emptyWallet).map(key => [key, wallet[key as keyof CollectorWallet]])) as CollectorWallet;
    accountData(user).connection = null;
    persist();
    return HttpResponse.json(accountData(user).wallets);
  }),
  // Simula conexão ou recusa da carteira e rede cadastradas, sem acessar extensões reais.
  http.post("*/api/wallets/connect", async ({ request }) => {
    // user resolve a identidade antes de autorizar a conexão simulada.
    const user = await prepare(request); if (user instanceof Response) return user;
    // input informa a seção da carteira e a rede que se pretende conectar.
    const input = await request.json() as { wallet: "primary" | "secondary"; network: string };
    // wallet recupera o cadastro da conta para conferir se a rede e os campos são válidos antes da conexão.
    const wallet = accountData(user).wallets[input.wallet];
    if (!wallet || Object.keys(walletErrors(wallet)).length || wallet.network !== input.network) return error(422, "WALLET_INVALID", "Cadastre uma carteira válida nesta rede antes de conectar.");
    if (scenarioFor(request) === "wallet-rejected") return error(409, "CONNECTION_REJECTED", "A conexão foi recusada na simulação.");
    accountData(user).connection = input;
    persist();
    return HttpResponse.json(input);
  }),
  // Recupera a conexão simulada que permanece associada à sessão.
  http.get("*/api/wallets/connect", async ({ request }) => {
    // user resolve a identidade antes de consultar qual carteira está conectada.
    const user = await prepare(request); return user instanceof Response ? user : HttpResponse.json(accountData(user).connection);
  }),
  // Desconecta a carteira da conta e confirma a remoção sem corpo de resposta.
  http.delete("*/api/wallets/connect", async ({ request }) => {
    // user resolve a identidade antes de desconectar a carteira da conta.
    const user = await prepare(request); if (user instanceof Response) return user;
    accountData(user).connection = null; persist();
    return new HttpResponse(null, { status: 204 });
  }),
  // Consulta identificadores e obras da lista privada de favoritos.
  http.get("*/api/favorites", async ({ request }) => {
    // user determina de qual conta a lista privada de favoritos deve ser consultada.
    const user = await prepare(request); if (user instanceof Response) return user;
    // ids contém os favoritos confirmados da conta, usados para montar a lista de obras.
    const ids = accountData(user).favorites;
    return HttpResponse.json({ ids, items: ids.flatMap(id => { /* nft recupera a obra correspondente ao favorito; recursos ausentes não entram na lista. */ const nft = findCatalogNFT(id); return nft ? [nft] : []; }) });
  }),
  // Inclui params.id nos favoritos da sessão sem duplicar uma inclusão já confirmada.
  http.put("*/api/favorites/:id", async ({ request, params }) => {
    // user determina a conta à qual o NFT será adicionado como favorito.
    const user = await prepare(request); if (user instanceof Response) return user;
    // id transforma o parâmetro da rota em identificador textual do NFT.
    const id = String(params.id);
    if (!findCatalogNFT(id)) return error(404, "NFT_NOT_FOUND", "NFT não encontrado.");
    // data é o registro privado da conta, atualizado sem duplicar um favorito já existente.
    const data = accountData(user); if (!data.favorites.includes(id)) data.favorites.push(id);
    persist(); return HttpResponse.json({ ids: data.favorites });
  }),
  // Remove params.id dos favoritos da sessão, preservando o catálogo e outras contas.
  http.delete("*/api/favorites/:id", async ({ request, params }) => {
    // user resolve a sessão antes de remover o favorito somente de sua própria conta.
    const user = await prepare(request); if (user instanceof Response) return user;
    // data referencia o registro da conta cuja lista terá o identificador solicitado removido.
    const data = accountData(user); data.favorites = data.favorites.filter(id => id !== params.id);
    persist(); return HttpResponse.json({ ids: data.favorites });
  }),
];
