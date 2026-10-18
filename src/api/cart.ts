import { api } from "./http";
import type { CartLineInput, CartResponse } from "./contracts";

/** As escritas nunca enviam preços; a API entrega o carrinho e a nova cotação juntos. */
export type CartOperation =
  | { type: "add" | "update"; input: CartLineInput }
  | { type: "remove"; nftId: string; edition: string }
  | { type: "coupon"; code: string }
  | { type: "remove-coupon" | "clear" | "quote" };

// cartApi centraliza a leitura e as escritas HTTP do carrinho, sem calcular preços na interface.
export const cartApi = {
  get: async (signal: AbortSignal) => (await api.get<CartResponse>("/cart", { signal })).data,
  mutate: async (operation: CartOperation): Promise<CartResponse> => {
    // operation.type escolhe o endpoint; input envia identificadores e quantidades, nunca preços.
    if (operation.type === "add") return (await api.post<CartResponse>("/cart/items", operation.input)).data;
    if (operation.type === "update") return (await api.patch<CartResponse>("/cart/items", operation.input)).data;
    if (operation.type === "remove") return (await api.delete<CartResponse>(`/cart/items/${encodeURIComponent(operation.nftId)}/${encodeURIComponent(operation.edition)}`)).data;
    if (operation.type === "coupon") return (await api.post<CartResponse>("/cart/coupon", { code: operation.code })).data;
    if (operation.type === "remove-coupon") return (await api.delete<CartResponse>("/cart/coupon")).data;
    if (operation.type === "clear") return (await api.delete<CartResponse>("/cart")).data;
    return (await api.post<CartResponse>("/quote")).data;
  },
};
