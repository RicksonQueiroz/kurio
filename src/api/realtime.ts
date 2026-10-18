import { io } from "socket.io-client";

/** Eventos públicos não carregam conta, token ou conteúdo privado. */
export type CatalogEvent = { eventId: string; id: string; version: number; payload: { price?: string; edition?: string; available?: number }; sentAt: string };
// realtime é o cliente Socket.IO compartilhado; a conexão só começa quando o hook registra seus listeners.
export const realtime = io(import.meta.env.VITE_REALTIME_URL || undefined, { path: "/kurio-socket/", transports: ["websocket"], autoConnect: false, reconnection: true, reconnectionDelay: 1000, reconnectionDelayMax: 5000 });

export { acceptCatalogEvent } from "../lib/eventVersion";
