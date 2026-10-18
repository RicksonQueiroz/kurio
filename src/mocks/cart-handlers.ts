import { http, HttpResponse } from "msw";
import { delay } from "msw";
import { authenticatedUser } from "./auth-handlers.ts";
import { findCatalogNFT, scenarioFor, updateCatalogNFT } from "./catalog-handlers.ts";
import { cartResponse, getStoredCart, persistCarts } from "./cart-database.ts";
import type { CartLineInput } from "../api/contracts.ts";

// error padroniza uma resposta HTTP de falha com código, mensagem e status.
const error = (status: number, code: string, message: string) => HttpResponse.json({ error: { code, message } }, { status });

/** Um token inválido nunca é rebaixado silenciosamente para acesso de visitante. */
async function resolveOwner(request: Request): Promise<string | Response> {
  if (request.headers.has("authorization")) {
    // user é a identidade pública resolvida a partir de uma sessão válida.
    const user = await authenticatedUser(request);
    return user ? `user:${user.id}` : error(401, "SESSION_EXPIRED", "Sua sessão expirou. Entre novamente para continuar.");
  }
  // guest é o identificador do visitante recebido no cabeçalho e validado antes do acesso.
  const guest = request.headers.get("x-kurio-guest");
  return guest && /^[a-zA-Z0-9-]{8,80}$/.test(guest) ? `guest:${guest}` : error(400, "GUEST_REQUIRED", "Identificação do visitante ausente.");
}

// Aplica o cenário de rede e resolve a identidade antes de executar uma operação de carrinho.
async function prepare(request: Request) {
  // scenario seleciona a condição reproduzível de rede ou de negócio solicitada no teste.
  const scenario = scenarioFor(request);
  await delay(scenario === "slow" ? 1800 : scenario === "mutation-error" && request.method !== "GET" ? 800 : 150);
  if (scenarioFor(request) === "offline") return HttpResponse.error();
  if (scenario === "error" || (scenario === "mutation-error" && request.method !== "GET")) return error(503, "TEMPORARY_UNAVAILABLE", "Não foi possível atualizar o carrinho. Tente novamente.");
  // owner define a identidade autorizada do carrinho; uma resposta de erro impede a operação.
  const owner = await resolveOwner(request);
  if (typeof owner === "string") {
    // nft é o registro do catálogo usado como referência de preço, edição e disponibilidade.
    const nft = findCatalogNFT("042");
    if (scenario === "price-changed" && nft?.price !== "1.25") updateCatalogNFT("042", { price: "1.25" });
    if (scenario === "stock-exhausted" && nft?.editions.find(item => item.edition === "1/50")?.available !== 0) updateCatalogNFT("042", { edition: "1/50", available: 0 });
    if (scenario === "catalog-default" && (nft?.price !== "1.19" || nft.editions.find(item => item.edition === "1/50")?.available !== 50)) updateCatalogNFT("042", { price: "1.19", edition: "1/50", available: 50 });
  }
  return owner;
}

/** POST adiciona; PATCH substitui a quantidade. Preços enviados pelo cliente são ignorados. */
async function writeLine(request: Request, mode: "add" | "update") {
  // owner define a identidade autorizada do carrinho; uma resposta de erro impede a operação.
  const owner = await prepare(request); if (owner instanceof Response) return owner;
  // input contém os dados recebidos pela requisição; seus campos são validados antes da gravação.
  const input = await request.json() as CartLineInput;
  if (!input || typeof input.nftId !== "string" || typeof input.edition !== "string" || !Number.isSafeInteger(input.quantity) || input.quantity < 1 || input.quantity > 1000) return error(422, "VALIDATION_ERROR", "Informe NFT, edição e quantidade inteira válida.");
  // nft é o registro do catálogo usado como referência de preço, edição e disponibilidade.
  const nft = findCatalogNFT(input.nftId);
  if (!nft) return error(404, "NFT_NOT_FOUND", "NFT não encontrado.");
  // edition é a edição do catálogo correspondente à linha enviada, incluindo o estoque atual.
  const edition = nft.editions.find(item => item.edition === input.edition);
  if (!edition) return error(422, "INVALID_EDITION", "Edição inválida.");
  // cart representa o carrinho da identidade atual, com itens e cotação associados.
  const cart = getStoredCart(owner);
  // existing é a linha já existente para o mesmo NFT e edição, evitando duplicar essa combinação.
  const existing = cart.lines.find(item => item.nftId === input.nftId && item.edition === input.edition);
  if (mode === "update" && !existing) return error(404, "CART_ITEM_NOT_FOUND", "Item não encontrado no carrinho.");
  // quantity é a quantidade inteira resultante da operação de inclusão ou alteração.
  const quantity = mode === "add" ? (existing?.quantity ?? 0) + input.quantity : input.quantity;
  // Se o estoque caiu, permite reduzir uma seleção antiga até regularizá-la ou removê-la.
  // reducingPreviousSelection permite reduzir uma seleção antiga acima do estoque sem liberar novas inclusões.
  const reducingPreviousSelection = mode === "update" && existing && quantity < existing.quantity;
  if (quantity > edition.available && !reducingPreviousSelection) return error(409, "STOCK_CONFLICT", `Há apenas ${edition.available} unidade(s) disponível(is) nesta edição.`);
  if (existing) existing.quantity = quantity;
  else cart.lines.push({ nftId: input.nftId, edition: input.edition, quantity });
  cart.version++;
  cart.notices = [];
  persistCarts();
  return HttpResponse.json(cartResponse(owner));
}

// cartHandlers registra as rotas simuladas de itens, cupons, limpeza e cotação do carrinho.
export const cartHandlers = [
  // Consulta itens e cotação da identidade de visitante ou da conta resolvida pela requisição.
  http.get("*/api/cart", async ({ request }) => {
    // owner define a identidade autorizada do carrinho; uma resposta de erro impede a operação.
    const owner = await prepare(request); return owner instanceof Response ? owner : HttpResponse.json(cartResponse(owner));
  }),
  // Adiciona uma seleção validando NFT, edição, quantidade e estoque pela mesma regra de escrita.
  http.post("*/api/cart/items", ({ request }) => writeLine(request, "add")),
  // Atualiza a quantidade da seleção sem aceitar preços enviados pelo cliente.
  http.patch("*/api/cart/items", ({ request }) => writeLine(request, "update")),
  // Remove apenas a linha identificada pelo NFT e pela edição informados na rota.
  http.delete("*/api/cart/items/:nftId/:edition", async ({ request, params }) => {
    // owner define a identidade autorizada do carrinho; uma resposta de erro impede a operação.
    const owner = await prepare(request); if (owner instanceof Response) return owner;
    // cart representa o carrinho da identidade atual, com itens e cotação associados.
    const cart = getStoredCart(owner);
    cart.lines = cart.lines.filter(item => item.nftId !== params.nftId || item.edition !== params.edition);
    cart.version++;
    cart.notices = [];
    if (!cart.lines.length) cart.coupon = null;
    persistCarts();
    return HttpResponse.json(cartResponse(owner));
  }),
  // Esvazia o carrinho da identidade atual e recalcula a cotação correspondente.
  http.delete("*/api/cart", async ({ request }) => {
    // owner define a identidade autorizada do carrinho; uma resposta de erro impede a operação.
    const owner = await prepare(request); if (owner instanceof Response) return owner;
    // cart representa o carrinho da identidade atual, com itens e cotação associados.
    const cart = getStoredCart(owner);
    cart.lines = []; cart.coupon = null; cart.notices = []; cart.version++;
    persistCarts();
    return HttpResponse.json(cartResponse(owner));
  }),
  // Valida e aplica o código promocional sem perder o cupom anterior quando o novo é inválido.
  http.post("*/api/cart/coupon", async ({ request }) => {
    // owner define a identidade autorizada do carrinho; uma resposta de erro impede a operação.
    const owner = await prepare(request); if (owner instanceof Response) return owner;
    // code contém o cupom recebido, ainda sem normalização ou validação.
    const { code } = await request.json() as { code: unknown };
    // coupon é o código normalizado que será comparado às regras de cupons da simulação.
    const coupon = typeof code === "string" ? code.trim().toUpperCase() : "";
    if (coupon === "EXPIRADO") return error(410, "COUPON_EXPIRED", "Este cupom expirou.");
    if (coupon !== "KURIO10") return error(422, "INVALID_COUPON", "Cupom inválido. Confira o código informado.");
    // cart representa o carrinho da identidade atual, com itens e cotação associados.
    const cart = getStoredCart(owner);
    if (!cart.lines.length) return error(422, "EMPTY_CART", "Adicione um NFT antes de aplicar o cupom.");
    cart.coupon = coupon; cart.version++;
    persistCarts();
    return HttpResponse.json(cartResponse(owner));
  }),
  // Remove o cupom aplicado e devolve os totais recalculados pela API.
  http.delete("*/api/cart/coupon", async ({ request }) => {
    // owner define a identidade autorizada do carrinho; uma resposta de erro impede a operação.
    const owner = await prepare(request); if (owner instanceof Response) return owner;
    // cart representa o carrinho da identidade atual, com itens e cotação associados.
    const cart = getStoredCart(owner);
    cart.coupon = null; cart.version++;
    persistCarts();
    return HttpResponse.json(cartResponse(owner));
  }),
  // Revalida disponibilidade, cupom, desconto, taxa e total, renovando a cotação quando necessário.
  http.post("*/api/quote", async ({ request }) => {
    // owner define a identidade autorizada do carrinho; uma resposta de erro impede a operação.
    const owner = await prepare(request); return owner instanceof Response ? owner : HttpResponse.json(cartResponse(owner));
  }),
];
