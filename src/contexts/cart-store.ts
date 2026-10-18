import { createContext, useContext } from "react";
import type { NFT } from "@/data/nfts";
import type { CartQuote } from "@/api/contracts";

// Representa um NFT adicionado ao carrinho.
// A edição identifica uma variante específica do NFT.
export type CartItem = {
  nft: NFT;
  edition: string;
  quantity: number;
  available?: number;
};

// Define os dados e as funções disponíveis no carrinho.
type CartContextType = {
  items: CartItem[];
  cartCount: number;
  cartTotal: string;
  quote: CartQuote | null;
  notices: string[];
  message: string;
  isLoading: boolean;
  isPending: boolean;
  error: unknown;
  retry: () => void;
  applyCoupon: (code: string) => void;
  removeCoupon: () => void;
  refreshQuote: () => void;

  // Adiciona um NFT com a quantidade e edição selecionadas.
  addToCart: (nft: NFT, quantity?: number, edition?: string) => void;

  // Remove ou atualiza um item identificado pelo NFT e edição.
  removeFromCart: (nftId: string, edition?: string) => void;
  updateQuantity: (nftId: string, quantity: number, edition?: string) => void;

  clearCart: () => void;
};

// Cria o contexto compartilhado pelos componentes.
// CartContext compartilha os dados e as ações do carrinho entre todas as telas.
export const CartContext = createContext<CartContextType | undefined>(undefined);

// Hook para acessar o carrinho em qualquer componente.
export function useCart() {
  // context é a instância de carrinho encontrada na árvore de provedores.
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart deve ser usado dentro de CartProvider");
  }

  return context;
}
