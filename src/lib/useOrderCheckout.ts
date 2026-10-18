import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import axios from "axios";
import { ordersApi } from "@/api/orders";
import type { ApiErrorResponse, OrderInput } from "@/api/contracts";
import { useAuth } from "@/contexts/auth-store";

/** O diário mantém a chave e o conteúdo exatos até a API reconhecer a tentativa. */
type Attempt = { key: string; input: OrderInput };
// useOrderCheckout coordena envio idempotente, consulta e recuperação do pedido; onValidationError associa falhas aos campos.
export function useOrderCheckout(onValidationError?: (error: unknown) => void) {
  // user identifica a conta dona do diário de tentativa e do cache privado de pedidos.
  const { user } = useAuth();
  // client permite atualizar e invalidar consultas depois das respostas e mudanças de estado do pedido.
  const client = useQueryClient();
  // navigate grava o identificador do pedido na URL para permitir retomada após refresh.
  const navigate = useNavigate();
  // orderId vem da URL e identifica o pedido que deve ser consultado sem criar outra compra.
  const { order: orderId } = useSearch({ from: "/payment" });
  // storageKey separa o diário persistido de cada usuário, impedindo recuperar a tentativa de outra conta.
  const storageKey = `kurio-order-attempt:${user!.id}`;
  // attempt guarda a chave e o corpo exatos da tentativa; setAttempt mantém a interface alinhada ao diário persistido.
  const [attempt, setAttempt] = useState<Attempt | null>(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) ?? "null"); } catch { return null; }
  });
  // O bloqueio síncrono cobre dois cliques antes da próxima renderização React.
  const locked = useRef(false);
  // message contém as orientações de revisão e recuperação; setMessage atualiza o feedback da operação.
  const [message, setMessage] = useState("");
  // queryKey identifica um pedido específico da conta atual dentro do cache.
  const queryKey = ["order", user!.id, orderId];
  // query consulta o pedido da URL e acompanha o estado enquanto estiver pendente.
  const query = useQuery({
    queryKey, queryFn: ({ signal }) => ordersApi.get(orderId!, signal), enabled: !!orderId,
    retry: false, refetchOnWindowFocus: true,
    refetchInterval: query => query.state.data?.status === "pending" ? 1000 : false,
  });
  // save grava ou remove value no armazenamento antes de refletir a tentativa no estado React.
  function save(value: Attempt | null) {
    if (value) localStorage.setItem(storageKey, JSON.stringify(value));
    else localStorage.removeItem(storageKey);
    setAttempt(value);
  }
  // mutation envia o pedido sem retry automático; trata confirmação, conflitos e recuperação de uma tentativa pendente.
  const mutation = useMutation({
    mutationFn: ordersApi.create, retry: false,
    onSuccess: async order => {
      client.setQueryData(["order", user!.id, order.id], order);
      // A URL precisa estar gravada antes de apagar o diário de recuperação.
      await navigate({ to: "/payment", search: previous => ({ ...previous, order: order.id }) });
      save(null);
    },
    onError: async error => {
      onValidationError?.(error);
      // Outra aba pode ter iniciado o pedido: consulta a tentativa existente, sem duplicá-la.
      if (axios.isAxiosError<ApiErrorResponse>(error) && error.response?.data.error.code === "ORDER_PENDING") {
        // pendingId identifica o pedido já aberto por outra tentativa para retomar sua consulta em vez de duplicar a compra.
        const pendingId = error.response.data.error.fields?.orderId;
        if (pendingId) {
          await navigate({ to: "/payment", search: previous => ({ ...previous, order: pendingId }) });
          save(null);
        }
      }
      // Conflitos conhecidos não criaram pedido; permitem revisar uma nova cotação.
      if (axios.isAxiosError<ApiErrorResponse>(error) && ["QUOTE_CHANGED", "STOCK_CONFLICT", "VALIDATION_ERROR", "WALLET_DISCONNECTED"].includes(error.response?.data.error.code ?? "")) {
        save(null);
        void client.invalidateQueries({ queryKey: ["cart", user!.id] });
        void client.invalidateQueries({ queryKey: ["connection", user!.id] });
        setMessage("Revise os dados e valores atualizados antes de confirmar novamente.");
      }
    },
    onSettled: () => { locked.current = false; },
  });
  // Depois da confirmação, invalida carrinho e catálogo para refletir os itens comprados e a baixa de estoque.
  useEffect(() => {
    if (query.data?.status === "confirmed") {
      void client.invalidateQueries({ queryKey: ["cart", user!.id] });
      void client.invalidateQueries({ queryKey: ["nfts"] });
    }
  }, [query.data?.status, client, user]);

  // submit recebe a cotação revisada e cria uma tentativa somente quando não existe envio ou pedido em recuperação.
  function submit(input: OrderInput) {
    if (locked.current || orderId || attempt) return;
    // next combina uma chave única com o corpo original, preservando o conteúdo exigido pela idempotência.
    const next = { key: crypto.randomUUID(), input };
    // Se a persistência falhar, não envia: não haveria como recuperar após timeout.
    try { save(next); } catch { setMessage("Não foi possível preservar a tentativa neste navegador. Libere o armazenamento e tente novamente."); return; }
    locked.current = true;
    setMessage("");
    mutation.mutate(next);
  }
  // recover reenvia a mesma tentativa preservada, mantendo chave e conteúdo para obter o pedido original.
  function recover() {
    if (!attempt || locked.current) return;
    locked.current = true;
    mutation.mutate(attempt);
  }
  return {
    order: query.data, orderId, attempt, submit, recover,
    busy: mutation.isPending || (!!orderId && (query.isPending || query.data?.status === "pending")),
    error: mutation.error ?? query.error, message,
    refresh: () => query.refetch(),
    close: () => { mutation.reset(); void navigate({ to: "/payment", search: previous => ({ ...previous, order: undefined }) }); },
  };
}
