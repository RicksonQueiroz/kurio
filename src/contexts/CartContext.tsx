import { useEffect, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./auth-store";
import { CartContext } from "./cart-store";
import { cartApi, type CartOperation } from "@/api/cart";
import { apiErrorMessage } from "@/api/http";
import type { CartResponse } from "@/api/contracts";
import { guestIdentity } from "@/lib/guest-identity";

/** Estado remoto por identidade. A API conserva itens, disponibilidade, cupom e valores. */
export function CartProvider({ children }: { children: ReactNode }) {
  // auth reúne a identidade atual e as operações de entrada, cadastro e saída.
  const auth = useAuth();
  // client acessa o cache compartilhado do TanStack Query para cancelar, consultar ou atualizar respostas.
  const client = useQueryClient();
  // key separa a query do carrinho por usuário ou visitante, impedindo compartilhamento de respostas privadas.
  const key = ["cart", auth.user?.id ?? `guest:${guestIdentity()}`];
  // message guarda o feedback exibido ao usuário; o respectivo setter atualiza essa mensagem.
  const [message, setMessage] = useState("");
  // writing suspende consultas periódicas enquanto uma escrita está em andamento.
  const [writing, setWriting] = useState(false);
  // lock bloqueia envios repetidos imediatamente, antes mesmo da próxima renderização.
  const lock = useRef(false);
  // active indica se o provedor ainda está montado; respostas tardias não atualizam outra sessão.
  const active = useRef(true);
  // Marca o ciclo de vida do provedor para impedir que respostas tardias de outra sessão atualizem seu cache.
  useEffect(() => {
    // O ciclo de montagem protege o cache contra callbacks que chegam após logout ou troca de conta.
    active.current = true;
    return () => { active.current = false; };
  }, []);
  // query reúne resposta, carregamento e erro da consulta remota usada por este componente.
  const query = useQuery({
    // A chave separa identidades; o sinal cancela leituras obsoletas; writing pausa leituras durante escritas.
    queryKey: key, queryFn: ({ signal }) => cartApi.get(signal), enabled: !auth.isLoading && !writing,
    retry: false, staleTime: 0, refetchOnWindowFocus: true, refetchInterval: 15_000,
  });
  // mutation coordena a escrita no servidor e seus estados de envio, sucesso e falha.
  const mutation = useMutation({
    mutationFn: cartApi.mutate, retry: false,
    onMutate: async (operation: CartOperation) => {
      // operation descreve a ação solicitada. O estado confirmado é preservado antes de antecipar a mudança visual.
      setMessage("");
      await client.cancelQueries({ queryKey: key });
      // previous guarda a última resposta confirmada para restaurá-la se a atualização otimista falhar.
      const previous = client.getQueryData<CartResponse>(key);
      // Quantidade responde imediatamente; cotação anterior não pode autorizar o checkout.
      if (previous && operation.type === "update") client.setQueryData<CartResponse>(key, {
        ...previous, quote: { ...previous.quote, valid: false },
        items: previous.items.map(item => item.nft.id === operation.input.nftId && item.edition === operation.input.edition ? { ...item, quantity: operation.input.quantity } : item),
      });
      return { previous };
    },
    onSuccess: (data, operation) => {
      // data é a resposta autoritativa: substitui a prévia otimista e atualiza o feedback da operação.
      if (!active.current) return;
      client.setQueryData(key, data);
      setMessage(operation.type === "coupon" ? `Cupom ${data.quote.coupon} aplicado.` : operation.type === "remove-coupon" ? "Cupom removido." : operation.type === "add" ? "NFT adicionado ao carrinho." : "Carrinho atualizado.");
    },
    onError: (error, _operation, context) => {
      // context contém a cópia anterior; uma falha não deve apagar itens ou manter valores não confirmados.
      if (!active.current) return;
      if (context?.previous) client.setQueryData(key, context.previous);
      setMessage(apiErrorMessage(error));
    },
    // Libera o bloqueio tanto no sucesso quanto na falha, permitindo uma nova tentativa.
    onSettled: () => { lock.current = false; if (active.current) setWriting(false); },
  });

  // run recebe uma operação do carrinho, bloqueia envios repetidos e encaminha a escrita para a mutation.
  function run(operation: CartOperation) {
    // Centraliza o bloqueio de cliques repetidos para todas as ações expostas pelo contexto.
    if (lock.current || auth.isLoading || query.isPending) return;
    lock.current = true;
    setWriting(true);
    mutation.mutate(operation);
  }
  // items contém os itens disponíveis na resposta atual; uma lista vazia evita acesso a dados ausentes.
  const items = query.data?.items ?? [];
  return <CartContext.Provider value={{
    items, cartCount: items.reduce((total, item) => total + item.quantity, 0),
    cartTotal: query.data?.quote.subtotal ?? "0", quote: query.data?.quote ?? null,
    notices: query.data?.notices ?? [], message, isLoading: query.isPending || auth.isLoading,
    isPending: mutation.isPending, error: query.error,
    retry: () => { void query.refetch(); },
    addToCart: (nft, quantity = 1, edition = "1/50") => run({ type: "add", input: { nftId: nft.id, quantity, edition } }),
    updateQuantity: (nftId, quantity, edition = "1/50") => quantity <= 0 ? run({ type: "remove", nftId, edition }) : run({ type: "update", input: { nftId, quantity, edition } }),
    removeFromCart: (nftId, edition = "1/50") => run({ type: "remove", nftId, edition }),
    clearCart: () => run({ type: "clear" }),
    applyCoupon: code => run({ type: "coupon", code }), removeCoupon: () => run({ type: "remove-coupon" }),
    refreshQuote: () => run({ type: "quote" }),
  }}>{children}</CartContext.Provider>;
}
