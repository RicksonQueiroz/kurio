import type { CatalogNFT, Order } from "../api/contracts.ts";

/** Cada conexão só recebe eventos privados depois de resolver sua sessão no mock. */
export type MockPeer = { userId: string | null; emit: (name: string, payload: unknown) => void; close: () => void };
// peers mantém as conexões simuladas ativas, incluindo a identidade validada de cada sessão.
export const peers = new Set<MockPeer>();
// nftEvent transforma o NFT em evento versionado com identidade estável, preço, estoque e instante de envio.
export function nftEvent(nft: CatalogNFT) {
  return { eventId: crypto.randomUUID(), id: nft.id, version: nft.version, payload: { price: nft.price, editions: nft.editions }, sentAt: new Date().toISOString() };
}
// publishNFT envia a mesma alteração de catálogo a todas as conexões e devolve o evento emitido.
export function publishNFT(nft: CatalogNFT) {
  // event representa uma única versão do NFT, compartilhada entre todos os destinatários dessa publicação.
  const event = nftEvent(nft);
  // peer é cada conexão ativa, que pode receber as mudanças públicas de preço e estoque.
  for (const peer of peers) peer.emit("nft.updated", event);
  return event;
}
// publishOrder emite a mudança apenas às conexões da conta proprietária do pedido.
export function publishOrder(order: Order) {
  // event identifica o pedido e seu dono; a versão distingue o estado pendente do resultado terminal.
  const event = { eventId: crypto.randomUUID(), id: order.id, userId: order.userId, version: order.status === "pending" ? 1 : 2, status: order.status };
  // peer só recebe o evento privado quando sua sessão corresponde ao dono do pedido.
  for (const peer of peers) if (peer.userId === order.userId) peer.emit("order.updated", event);
}
