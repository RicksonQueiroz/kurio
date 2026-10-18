import { api } from "./http";
import type { Order, OrderInput } from "./contracts";

/** Todas as tentativas e consultas passam pelo mesmo transporte autenticado. */
export const ordersApi = {
  create: async ({ key, input }: { key: string; input: OrderInput }) =>
    (await api.post<Order>("/orders", input, { headers: { "Idempotency-Key": key } })).data,
  get: async (id: string, signal?: AbortSignal) =>
    (await api.get<Order>(`/orders/${encodeURIComponent(id)}`, { signal })).data,
};
