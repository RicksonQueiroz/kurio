import { ws, http, HttpResponse } from "msw";
import { toSocketIo } from "@mswjs/socket.io-binding";
import { authenticatedUser } from "./auth-handlers.ts";
import { catalogSnapshot, updateCatalogNFT, findCatalogNFT } from "./catalog-handlers.ts";
import { ordersForUser } from "./order-handlers.ts";
import { peers, nftEvent, publishOrder, type MockPeer } from "./events.ts";

/** O binding implementa Engine.IO/Socket.IO sobre WebSocket interceptado pelo MSW. */
// Caminho próprio evita a normalização especial de /socket.io/ e não captura o HMR do Vite.
const channel = ws.link(/\/kurio-socket\/?$/);
// socketHandlers intercepta o transporte Engine.IO/Socket.IO e oferece o endpoint que dispara cenários reproduzíveis.
export const socketHandlers = [
  channel.addEventListener("connection", connection => {
    // client adapta a conexão WebSocket interceptada para eventos do protocolo Socket.IO.
    const { client } = toSocketIo(connection);
    // peer representa uma conexão ativa, inicialmente anônima, com ações para emitir eventos e encerrar o transporte.
    const peer: MockPeer = { userId: null, emit: (name, payload) => client.emit(name, payload), close: () => connection.client.close() };
    peers.add(peer);
    // Heartbeat do Engine.IO; o socket.io-client responde pelo próprio protocolo.
    const heartbeat = setInterval(() => connection.client.send("2"), 20_000);
    // subscriptionVersion conta mudanças de inscrição para impedir que uma validação antiga associe a identidade errada.
    let subscriptionVersion = 0;
    connection.client.addEventListener("close", () => { clearInterval(heartbeat); peers.delete(peer); });
    client.on("session.subscribe", async (_event, input: { token?: string | null }) => {
      // version conserva o número desta inscrição enquanto a sessão é resolvida de forma assíncrona.
      const version = ++subscriptionVersion;
      // user resolve o token apresentado; ausência de sessão permite apenas eventos públicos de catálogo.
      const user = input?.token ? await authenticatedUser(new Request("http://kurio.mock/session", { headers: { Authorization: `Bearer ${input.token}` } })) : null;
      if (version !== subscriptionVersion || !peers.has(peer)) return;
      peer.userId = user?.id ?? null;
      peer.emit("catalog.snapshot", catalogSnapshot().map(nftEvent));
      if (user) ordersForUser(user.id).forEach(publishOrder);
    });
  }),
  // Aplica o cenário recebido em request ao banco e emite seus eventos pelo transporte Socket.IO.
  http.post("*/api/mock/events", async ({ request }) => {
    // scenario escolhe qual alteração controlada será aplicada ao banco e publicada pelo socket.
    const { scenario } = await request.json() as { scenario: string };
    if (scenario === "disconnect") { /* peer identifica cada conexão afetada pelo cenário de desconexão, duplicação ou versão antiga do evento. */ for (const peer of peers) peer.close(); return HttpResponse.json({ disconnected: true }); }
    if (!["price-changed", "stock-exhausted", "duplicate", "out-of-order", "reset"].includes(scenario)) return HttpResponse.json({ error: { code: "INVALID_SCENARIO", message: "Cenário de evento inválido." } }, { status: 422 });
    // patch descreve a mudança determinística de preço ou estoque, compartilhada com as respostas REST.
    const patch = scenario === "stock-exhausted" ? { edition: "1/50", available: 0 } : scenario === "reset" ? { price: "1.19", edition: "1/50", available: 50 } : { price: "1.25" };
    updateCatalogNFT("042", patch);
    // event representa a versão atual da obra; o cenário pode repetir essa versão ou emitir uma versão antiga deliberadamente.
    const event = nftEvent(findCatalogNFT("042")!);
    if (scenario === "duplicate") /* peer identifica cada conexão afetada pelo cenário de desconexão, duplicação ou versão antiga do evento. */ for (const peer of peers) { peer.emit("nft.updated", event); peer.emit("nft.updated", event); }
    if (scenario === "out-of-order") /* peer identifica cada conexão afetada pelo cenário de desconexão, duplicação ou versão antiga do evento. */ for (const peer of peers) peer.emit("nft.updated", { ...event, eventId: crypto.randomUUID(), version: event.version - 1, payload: { price: "0.01" } });
    return HttpResponse.json(event);
  }),
];
