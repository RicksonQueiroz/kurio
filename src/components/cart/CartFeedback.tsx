import { useCart } from "@/contexts/cart-store";
import { apiErrorMessage } from "@/api/http";

/** Feedback compartilhado sem substituir os itens conservados quando uma operação falha. */
export function CartFeedback() {
  // message, notices e issues compõem o feedback; error e isPending distinguem falha de envio em andamento.
  const { message, notices, quote, error, retry, isPending } = useCart();
  // messages agrupa os avisos que serão apresentados de forma acessível na interface.
  const messages = [...notices, ...(quote?.issues ?? []), ...(message ? [message] : [])];
  if (!messages.length && !error && !isPending) return null;
  return <div className="mx-auto w-full max-w-[1200px] px-6 py-3 text-[12px] leading-5 text-[#E89B55]">
    {isPending && <p role="status">Atualizando carrinho e cotação…</p>}
    {!!error && <div role="alert"><p>{apiErrorMessage(error)}</p><button onClick={retry} className="mt-2 underline">Tentar carregar o carrinho novamente</button></div>}
    {!!messages.length && <div role="status">{messages.map((message, index) => <p key={`${index}-${message}`}>{message}</p>)}</div>}
  </div>;
}
