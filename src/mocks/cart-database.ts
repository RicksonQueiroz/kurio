import type { CartLineInput, CartResponse } from "../api/contracts.ts";
import { findCatalogNFT } from "./catalog-handlers.ts";
import { addEth, subtractEth, multiplyEth, fromWei, toWei } from "../lib/money.ts";
import { ESTIMATED_NETWORK_FEE } from "../lib/cart.ts";

// StoredCart persiste a seleção; prices registra valores já observados para reconhecer mudanças.
type StoredCart = { lines: CartLineInput[]; coupon: string | null; version: number; notices: string[]; prices?: Record<string, string>; quote?: { id: string; fingerprint: string; expiresAt: number } };
// DATABASE_KEY define a chave exclusiva usada para persistir o banco deste recurso simulado.
const DATABASE_KEY = "kurio-mock-carts-v1";
// carts armazena os carrinhos simulados, indexados por identidade de visitante ou conta.
let carts: Record<string, StoredCart> | undefined;

/** A persistência pertence ao mock da API. Componentes não leem nem escrevem este banco. */
function database() {
  if (!carts) {
    try { carts = typeof localStorage !== "undefined" ? JSON.parse(localStorage.getItem(DATABASE_KEY) ?? "{}") : {}; }
    catch { carts = {}; }
    if (!carts || typeof carts !== "object" || Array.isArray(carts)) carts = {};
  }
  return carts;
}
// Grava os carrinhos simulados, mantendo os dados entre recargas da página.
export function persistCarts() {
  if (typeof localStorage !== "undefined") localStorage.setItem(DATABASE_KEY, JSON.stringify(database()));
}
// Esvazia o banco de carrinhos para iniciar um cenário conhecido.
export function resetCarts() {
  carts = {};
  persistCarts();
}

// Recupera o carrinho da identidade e migra apenas os seus dados antigos quando necessário.
export function getStoredCart(owner: string): StoredCart {
  // db acessa o banco em memória da simulação, compartilhado pelos handlers deste recurso.
  const db = database();
  if (!db[owner]) {
    db[owner] = { lines: [], coupon: null, version: 1, notices: [] };
    // Migra somente o carrinho correspondente à identidade atual das prévias anteriores.
    // legacyKey aponta apenas para a chave antiga pertencente à identidade que está sendo migrada.
    const legacyKey = owner.startsWith("user:") ? `kurio-cart:${owner.slice(5)}` : "kurio-cart";
    try {
      // legacy contém os itens da prévia antiga, validados antes de entrar no banco simulado.
      const legacy = typeof localStorage !== "undefined" ? JSON.parse(localStorage.getItem(legacyKey) ?? "[]") : [];
      if (Array.isArray(legacy)) /* item é uma seleção antiga, validada antes da migração para o carrinho da API. */ for (const item of legacy) {
        // nft é o registro do catálogo usado como referência de preço, edição e disponibilidade.
        const nft = findCatalogNFT(item?.nft?.id);
        if (nft && nft.editions.some(edition => edition.edition === item.edition) && Number.isSafeInteger(item.quantity) && item.quantity > 0) {
          db[owner].lines.push({ nftId: nft.id, edition: item.edition, quantity: item.quantity });
        }
      }
      if (typeof localStorage !== "undefined") localStorage.removeItem(legacyKey);
    } catch { /* Dados antigos inválidos iniciam um carrinho vazio. */ }
    persistCarts();
  }
  return db[owner];
}

/** Login consome o carrinho visitante uma vez, sem copiar dados entre contas autenticadas. */
export function mergeVisitorCart(userId: string, guestId: string | null) {
  if (!guestId) return;
  // guest é o carrinho do visitante consumido pela mesclagem no login.
  const guest = getStoredCart(`guest:${guestId}`);
  // target é o carrinho da conta que receberá os itens do visitante.
  const target = getStoredCart(`user:${userId}`);
  // line é uma seleção do visitante, mesclada à conta sem perder a edição ou duplicar a migração.
  for (const line of guest.lines) {
    // existing é a linha já existente para o mesmo NFT e edição, evitando duplicar essa combinação.
    const existing = target.lines.find(item => item.nftId === line.nftId && item.edition === line.edition);
    if (existing) existing.quantity = Math.min(1000, existing.quantity + line.quantity);
    else target.lines.push({ ...line });
  }
  if (!target.coupon) target.coupon = guest.coupon;
  if (guest.lines.length) {
    target.version++;
    target.notices = ["Os itens do visitante foram preservados. A disponibilidade foi revalidada."];
  }
  guest.lines = [];
  guest.coupon = null;
  guest.version++;
  persistCarts();
}

/** Cotação autoritativa em wei. KURIO10 concede 10%, truncando somente frações de wei. */
export function cartResponse(owner: string): CartResponse {
  // cart representa o carrinho da identidade atual, com itens e cotação associados.
  const cart = getStoredCart(owner);
  cart.prices ??= {};
  // issues reúne impedimentos de estoque ou catálogo que tornam a cotação inválida.
  const issues: string[] = [];
  // items contém os itens disponíveis na resposta atual; uma lista vazia evita acesso a dados ausentes.
  const items = cart.lines.flatMap(line => {
    // nft é o registro do catálogo usado como referência de preço, edição e disponibilidade.
    const nft = findCatalogNFT(line.nftId);
    if (!nft) { issues.push(`NFT ${line.nftId} não está mais disponível.`); return []; }
    // previousPrice guarda o preço observado anteriormente para reconhecer uma alteração de catálogo.
    const previousPrice = cart.prices![nft.id];
    if (previousPrice && previousPrice !== nft.price) {
      // notice descreve a mudança de preço que deve ser apresentada ao colecionador.
      const notice = `O preço de ${nft.name} mudou de ${previousPrice} para ${nft.price} ETH. Confira a nova cotação.`;
      if (!cart.notices.includes(notice)) cart.notices.push(notice);
    }
    cart.prices![nft.id] = nft.price;
    // available indica quantas unidades da edição ainda estão disponíveis no catálogo.
    const available = nft.editions.find(edition => edition.edition === line.edition)?.available ?? 0;
    if (available < line.quantity) issues.push(`${nft.name}, edição ${line.edition}: há ${available} unidade(s) disponível(is).`);
    return [{ nft: { id: nft.id, name: nft.name, image: nft.image, price: nft.price }, edition: line.edition, quantity: line.quantity, available, nftVersion: nft.version }];
  });
  // subtotal soma os preços autoritativos multiplicados pelas quantidades, preservando a precisão em wei.
  const subtotal = addEth(...items.map(item => multiplyEth(item.nft.price, item.quantity)));
  // discount contém o desconto exato em ETH, representado como texto decimal.
  const discount = cart.coupon === "KURIO10" ? fromWei(toWei(subtotal) / 10n) : "0";
  // networkFee contém a taxa fictícia da cotação; no carrinho vazio, a taxa é zero.
  const networkFee = items.length ? ESTIMATED_NETWORK_FEE : "0";
  // O vencimento pertence à API e não pode ser prorrogado por um valor enviado pelo cliente.
  const fingerprint = `${cart.version}:${items.map(item => `${item.nft.id}-${item.nftVersion}`).join("_")}:${discount}:${networkFee}`;
  if (!cart.quote || cart.quote.fingerprint !== fingerprint || cart.quote.expiresAt <= Date.now()) {
    cart.quote = { id: crypto.randomUUID(), fingerprint, expiresAt: Date.now() + 5 * 60_000 };
  }
  persistCarts();
  return {
    items, version: cart.version, notices: cart.notices,
    quote: {
      id: cart.quote.id,
      cartVersion: cart.version, expiresAt: cart.quote.expiresAt,
      subtotal, discount, networkFee, total: addEth(subtractEth(subtotal, discount), networkFee),
      coupon: cart.coupon, valid: items.length > 0 && issues.length === 0, issues,
    },
  };
}
