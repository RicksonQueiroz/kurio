import { http, HttpResponse } from "msw";
import { delay } from "msw";
import type { Order, OrderInput } from "../api/contracts.ts";
import { authenticatedUser } from "./auth-handlers.ts";
import { cartResponse, getStoredCart, persistCarts } from "./cart-database.ts";
import { findCatalogNFT, scenarioFor, updateCatalogNFT } from "./catalog-handlers.ts";
import { accountData, walletErrors } from "./account-handlers.ts";
import { publishOrder } from "./events.ts";

/** Chave e conteúdo ficam juntos para reconhecer reenvios mesmo após refresh. */
type StoredOrder = { order: Order; key: string; fingerprint: string; settleAt: number; decline: boolean };
// DATABASE_KEY isola a persistência dos pedidos e das chaves de idempotência dos outros bancos simulados.
const DATABASE_KEY = "kurio-mock-orders-v1";
// O banco pertence ao mock: componentes só recebem recursos pela rede.
let records: StoredOrder[] | undefined;
// database recupera os pedidos persistidos uma única vez e substitui dados inválidos por uma lista vazia.
function database(): StoredOrder[] {
  if (!records) {
    try { records = typeof localStorage === "undefined" ? [] : JSON.parse(localStorage.getItem(DATABASE_KEY) ?? "[]"); }
    catch { records = []; }
    if (!Array.isArray(records)) records = [];
  }
  return records;
}
// persist grava os pedidos atuais e o diário de idempotência quando há localStorage disponível.
function persist() {
  if (typeof localStorage !== "undefined") localStorage.setItem(DATABASE_KEY, JSON.stringify(database()));
}
// resetOrders restaura o banco vazio para que um cenário não reutilize pedidos de testes anteriores.
export function resetOrders() { records = []; persist(); }
// failure padroniza respostas de erro sem criar ou alterar pedidos.
const failure = (status: number, code: string, message: string, fields?: Record<string, string>) => HttpResponse.json({ error: { code, message, fields } }, { status });

/** Ordena propriedades para que a ordem das chaves JSON não altere a idempotência. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, entry]) => `${JSON.stringify(key)}:${canonical(entry)}`).join(",")}}`;
  return JSON.stringify(value);
}

/** A consulta materializa o resultado ao vencer o prazo, inclusive depois de uma recarga. */
function settle(record: StoredOrder) {
  // order referencia o snapshot do pedido que está sendo processado, preservando seus valores originais.
  const order = record.order;
  if (order.status !== "pending" || Date.now() < record.settleAt) return;
  // Estoque é conferido novamente, sem awaits entre a validação e a baixa.
  const unavailable = order.items.some(line => (findCatalogNFT(line.nft.id)?.editions.find(e => e.edition === line.edition)?.available ?? 0) < line.quantity);
  if (record.decline || unavailable) {
    order.status = "declined";
    order.reason = unavailable ? "A disponibilidade mudou durante o processamento. Revise o carrinho." : "A carteira recusou o pagamento simulado. Seus itens foram preservados.";
  } else {
    order.status = "confirmed";
    order.transactionId = `SIM-${order.id}`;
    // cart é o carrinho atual da conta; apenas as quantidades efetivamente compradas serão subtraídas.
    const cart = getStoredCart(`user:${order.userId}`);
    // line é cada item comprado no snapshot; sua edição e quantidade determinam a baixa de estoque e carrinho.
    for (const line of order.items) {
      // nft recupera o estoque atual da obra, sem substituir o preço armazenado no recibo.
      const nft = findCatalogNFT(line.nft.id)!;
      // available é o estoque da edição imediatamente antes da baixa confirmada.
      const available = nft.editions.find(e => e.edition === line.edition)!.available;
      updateCatalogNFT(nft.id, { edition: line.edition, available: available - line.quantity });
      // Subtrai só a quantidade comprada; inclusões posteriores continuam no carrinho.
      const current = cart.lines.find(item => item.nftId === line.nft.id && item.edition === line.edition);
      if (current) current.quantity = Math.max(0, current.quantity - line.quantity);
    }
    cart.lines = cart.lines.filter(line => line.quantity > 0);
    if (!cart.lines.length) cart.coupon = null;
    cart.version++;
    persistCarts();
  }
  persist();
  publishOrder(order);
}

/** A reconexão consulta apenas os pedidos da sessão resolvida pelo servidor simulado. */
export function ordersForUser(userId: string) {
  // own contém somente os pedidos da conta solicitada, que podem ser reconciliados na reconexão.
  const own = database().filter(record => record.order.userId === userId);
  own.forEach(settle);
  return own.map(record => record.order);
}

// prepare simula condições de rede e verifica a sessão antes de consultar ou criar um pedido.
async function prepare(request: Request) {
  await delay(scenarioFor(request) === "slow" ? 1800 : 150);
  if (scenarioFor(request) === "offline") return HttpResponse.error();
  if (["error", "mutation-error"].includes(scenarioFor(request))) return failure(503, "TEMPORARY_UNAVAILABLE", "O serviço de pedidos está indisponível. Tente novamente com a mesma tentativa.");
  return await authenticatedUser(request) ?? failure(401, "SESSION_EXPIRED", "Sua sessão expirou. Entre novamente para recuperar seu pedido.");
}

// orderHandlers reúne criação idempotente e consulta privada de pedidos, usando o mesmo banco persistido.
export const orderHandlers = [
  // Cria ou recupera a tentativa idempotente depois de validar sessão, carteira, dados e cotação.
  http.post("*/api/orders", async ({ request }) => {
    // user contém a identidade resolvida ou a resposta de erro que impede criar a compra.
    const user = await prepare(request); if (user instanceof Response) return user;
    // key é a chave de idempotência enviada no cabeçalho; identifica uma tentativa sem depender de cliques ou reenvios.
    const key = request.headers.get("idempotency-key");
    if (!key || !/^[a-zA-Z0-9-]{8,100}$/.test(key)) return failure(422, "IDEMPOTENCY_REQUIRED", "Identifique a tentativa de compra.");
    // input receberá o corpo validável do pedido; JSON inválido encerra a operação sem criar registros.
    let input: OrderInput;
    try { input = await request.json() as OrderInput; }
    catch { return failure(422, "VALIDATION_ERROR", "Dados do pedido inválidos."); }
    // fingerprint é a representação canônica do corpo, usada para rejeitar a mesma chave com conteúdo diferente.
    const fingerprint = canonical(input);
    // existing localiza a tentativa já registrada para esta conta e chave, permitindo recuperar o mesmo pedido.
    const existing = database().find(record => record.order.userId === user.id && record.key === key);
    if (existing) {
      if (existing.fingerprint !== fingerprint) return failure(409, "IDEMPOTENCY_CONFLICT", "Esta tentativa já foi usada com outros dados.");
      settle(existing);
      return HttpResponse.json(existing.order);
    }
    if (!input || !["Ethereum", "Polygon", "Solana"].includes(input.network) || !["WalletConnect", "MetaMask", "Coinbase Wallet"].includes(input.provider) || typeof input.wallet !== "string" || !input.wallet.trim()) return failure(422, "VALIDATION_ERROR", "Selecione carteira, provedor e rede válidos.");
    // account contém os cadastros e a conexão simulada usados para validar o pagamento da conta.
    const account = accountData(user);
    // wallet seleciona a carteira cadastrada que precisa corresponder à rede e à conexão do pedido.
    const wallet = account.wallets[input.wallet as "primary" | "secondary"];
    if (!wallet || Object.keys(walletErrors(wallet)).length || wallet.network !== input.network || account.connection?.wallet !== input.wallet || account.connection.network !== input.network) return failure(409, "WALLET_DISCONNECTED", "Conecte uma carteira cadastrada na rede selecionada antes de confirmar.");
    if (input.collector) {
      // required lista os dados obrigatórios do colecionador antes de aceitar o checkout desktop.
      const required = ["displayName", "username", "profileName", "walletAddress", "referralCode", "email"];
      // fields associa falhas do colecionador aos nomes dos campos para correção acessível no formulário.
      const fields: Record<string, string> = {};
      // field é cada nome obrigatório do colecionador; um valor ausente produz uma mensagem para esse controle.
      for (const field of required) if (typeof input.collector[field] !== "string" || !input.collector[field].trim()) fields[field] = "Preencha este campo.";
      if (!/^\S+@\S+\.\S+$/.test(input.collector.email)) fields.email = "Informe um e-mail válido.";
      // addressPattern escolhe a validação de endereço compatível com a rede solicitada no pedido.
      const addressPattern = input.network === "Solana" ? /^[1-9A-HJ-NP-Za-km-z]{32,44}$/ : /^0x[a-fA-F0-9]{40}$/;
      if (!addressPattern.test(input.collector.walletAddress)) fields.walletAddress = "Informe um endereço válido para a rede selecionada.";
      if (input.collector.network !== input.network) fields.network = "Use a mesma rede da carteira conectada ao pedido.";
      if (Object.keys(fields).length) return failure(422, "VALIDATION_ERROR", "Confira os dados do colecionador.", fields);
    }
    // Uma tentativa pendente deve ser recuperada antes de permitir outro envio da conta.
    const pending = database().find(record => record.order.userId === user.id && record.order.status === "pending");
    if (pending) return HttpResponse.json({ error: { code: "ORDER_PENDING", message: "Existe um pedido em processamento. Recuperando a tentativa anterior.", fields: { orderId: pending.order.id } } }, { status: 409 });
    // cart contém itens e cotação recalculados pela simulação, referência final de preço, desconto, disponibilidade e taxa.
    const cart = cartResponse(`user:${user.id}`);
    if (!cart.quote.valid) return failure(409, "STOCK_CONFLICT", cart.quote.issues.join(" ") || "O carrinho está vazio.");
    if (input.quoteId !== cart.quote.id || input.quoteExpiresAt !== cart.quote.expiresAt || cart.quote.expiresAt <= Date.now()) return failure(409, "QUOTE_CHANGED", "A cotação mudou ou venceu. Revise os valores atualizados e confirme novamente.");
    // order é o novo snapshot pendente: conserva itens e totais independentemente de alterações posteriores no catálogo.
    const order: Order = {
      id: crypto.randomUUID(), userId: user.id, status: "pending", createdAt: new Date().toISOString(), transactionId: null, reason: null,
      input, items: structuredClone(cart.items), provider: input.provider,
      subtotal: cart.quote.subtotal, discount: cart.quote.discount, networkFee: cart.quote.networkFee, total: cart.quote.total,
    };
    database().push({ order, key, fingerprint, settleAt: Date.now() + (scenarioFor(request) === "order-pending" ? 60_000 : 1800), decline: scenarioFor(request) === "order-declined" });
    persist();
    publishOrder(order);
    // O evento nasce na camada de mocks; a UI não fabrica o resultado do pedido.
    const timer = setTimeout(() => { /* record recupera o pedido ainda existente antes da transição agendada; um reset anterior torna o callback inofensivo. */ const record = database().find(item => item.order.id === order.id); if (record) settle(record); }, scenarioFor(request) === "order-pending" ? 60_010 : 1810);
    // No Node, o temporizador não mantém o processo de teste aberto após seu encerramento.
    (timer as unknown as { unref?: () => void }).unref?.();
    // Simula resposta perdida depois da gravação: o mesmo reenvio recupera o pedido.
    if (scenarioFor(request) === "order-timeout") return HttpResponse.error();
    return HttpResponse.json(order, { status: 202 });
  }),
  // Consulta o pedido identificado por params.id somente quando ele pertence à sessão autenticada.
  http.get("*/api/orders/:id", async ({ request, params }) => {
    // user resolve a sessão antes da leitura de um recibo privado.
    const user = await prepare(request); if (user instanceof Response) return user;
    // record encontra o pedido somente quando identificador e usuário correspondem à sessão atual.
    const record = database().find(item => item.order.id === params.id && item.order.userId === user.id);
    if (!record) return failure(404, "ORDER_NOT_FOUND", "Pedido não encontrado para esta conta.");
    settle(record);
    return HttpResponse.json(record.order);
  }),
];
