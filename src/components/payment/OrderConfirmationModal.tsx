import { displayEth as formatEth, multiplyEth } from "@/lib/money";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { trapDialogTab } from "@/lib/dialogFocus";
import { useModalInert } from "@/lib/useModalInert";

import type { Order } from "@/api/contracts";

// order é o snapshot confirmado devolvido pela API; onClose encerra a visualização do recibo.
type OrderConfirmationModalProps = {
  order: Order;
  onClose: () => void;
};

/**
 * Modal do frame Desktop / Confirmação de Pedido.
 * Apresenta o snapshot confirmado da API simulada, independente do catálogo atual.
 */
export function OrderConfirmationModal({ order, onClose }: OrderConfirmationModalProps) {
  // dialogRef mantém a referência ao elemento do diálogo para controlar foco e teclado.
  const dialogRef = useRef<HTMLDialogElement>(null);
  useModalInert(dialogRef);

  // O dialog nativo bloqueia o fundo e mantém o foco dentro do modal.
  // Ao desmontar, restaura o foco no botão que abriu a confirmação.
  useEffect(() => {
    // dialog é o elemento nativo do diálogo, usado para abrir e fechar a camada modal.
    const dialog = dialogRef.current;
    // previousFocus guarda o elemento que tinha foco antes da abertura, permitindo devolvê-lo ao fechar.
    const previousFocus = document.activeElement;
    // previousOverflow preserva a configuração de rolagem anterior ao bloqueio do fundo da página.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog?.showModal();
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, []);

  // A data pertence ao pedido persistido, sem representar uma transação na blockchain.
  const dateParts = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
  }).formatToParts(new Date(order.createdAt));
  // day guarda o dia extraído da data de criação da prévia.
  const day = dateParts.find((part) => part.type === "day")!.value;
  // month guarda o mês extraído da data de criação da prévia.
  const month = dateParts.find((part) => part.type === "month")!.value.replace(".", "");
  // year guarda o ano extraído da data de criação da prévia.
  const year = dateParts.find((part) => part.type === "year")!.value;
  // formattedDate monta a data apresentada no recibo demonstrativo sem alterar a data armazenada.
  const formattedDate = `${day} ${month.charAt(0).toUpperCase()}${month.slice(1)}, ${year}`;

  return (
    // Largura original de 578px e faixa inferior de 10px.
    // Em janelas baixas, o modal rola sem perder o conteúdo nem exceder a viewport.
    <dialog
      ref={dialogRef}
      aria-labelledby="order-confirmation-title"
      aria-describedby="order-confirmation-description"
      onKeyDown={event => trapDialogTab(event, event.currentTarget)}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      className="fixed inset-0 m-auto max-h-[calc(100svh-48px)] w-[578px] max-w-[calc(100vw-32px)] overflow-y-auto border-0 border-b-[10px] border-solid border-[#D28A4C] bg-[#241612] p-0 text-[#F5F1EB] backdrop:bg-black/60"
    >
      {/* Cabeçalho de 156px com o SVG original exportado do Figma. */}
      <header className="relative flex min-h-[156px] flex-col items-center justify-center gap-4 px-8 pb-5 pt-6">
        <button type="button" onClick={onClose} aria-label="Fechar confirmação de pedido" className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center text-[#D28A4C] focus-visible:outline-2 focus-visible:outline-[#D28A4C]">
          <X size={18} strokeWidth={1} />
        </button>
        <img src="/icons/thank-you.svg" alt="" aria-hidden="true" className="h-20 w-20" />
        <h2 id="order-confirmation-title" className="text-center text-[16px] font-bold leading-4 text-[#CFB28C]">Seus NFTs agora estão na sua carteira</h2>
      </header>

      {/* Metadados do snapshot e referência simulada, separados como no frame desktop. */}
      <dl className="grid min-h-[67px] grid-cols-[1.2fr_1.1fr_1fr_.8fr] items-center border-y border-[#D28A4C] px-9 py-1 text-[14px] leading-[18px] text-[#CFB28C] max-[540px]:grid-cols-2 max-[540px]:gap-y-3 max-[540px]:px-5 max-[540px]:py-3">
        <div className="border-r border-[#D28A4C] pr-3"><dt className="font-bold">ID da transação</dt><dd className="break-all" title={order.transactionId ?? order.id}>{order.transactionId?.slice(0, 12)}…</dd></div>
        <div className="border-r border-[#D28A4C] px-4 max-[540px]:border-0"><dt>Data</dt><dd>{formattedDate}</dd></div>
        <div className="border-r border-[#D28A4C] px-4 max-[540px]:pl-0"><dt>Total</dt><dd className="whitespace-nowrap">{formatEth(order.total, 3)} ETH</dd></div>
        <div className="pl-4"><dt className="font-bold">Carteira</dt><dd className="break-words">{order.provider}</dd></div>
      </dl>

      {/* Detalhes com padding 20px/44px/48px e espaço de 12px entre blocos.
          A altura mínima mantém a composição do frame; listas maiores expandem a área. */}
      <section aria-label="Detalhes da transação" className="flex min-h-[588px] flex-col gap-3 px-11 pb-12 pt-5 max-[540px]:px-5">
        <h3 className="text-[16px] font-bold leading-4">Detalhes da transação</h3>

        {/* Tabela semântica: cada edição comprada ocupa uma linha própria. */}
        <table className="w-full table-fixed border-collapse text-left text-[14px]">
          {/* Em telas estreitas, os títulos menores e as colunas reservam espaço para os valores em ETH. */}
          <thead className="border-b border-[#61452F] text-[16px] leading-4 max-[540px]:text-[12px]">
            <tr><th scope="col" className="w-[60%] pb-3 font-bold max-[540px]:w-[44%]">NFTs</th><th scope="col" className="w-[16%] pb-3 text-center font-bold max-[540px]:w-[22%]">Edições</th><th scope="col" className="pb-3 text-right font-normal">Subtotal</th></tr>
          </thead>
          <tbody>
            {order.items.map(({ nft, edition, quantity }) => (
              <tr key={`${nft.id}-${edition}`}>
                <td className="py-1.5 pr-2 align-middle">
                  <div className="flex items-center gap-3 max-[540px]:flex-col max-[540px]:items-start">
                    <img src={nft.image} alt={`${nft.name} #${nft.id}`} className="h-[70px] w-[70px] shrink-0 rounded-[8px] object-cover" />
                    <div className="min-w-0">
                      <p className="text-[16px] font-bold leading-5">{nft.name} #{nft.id}</p>
                      <p className="mt-1 text-[14px] leading-4 text-[#B39463]">ID do token: #{nft.id.padStart(4, "0")}</p>
                      <span className="sr-only">Edição: {edition}</span>
                    </div>
                  </div>
                </td>
                <td className="text-center text-[#CFB28C]">(x {quantity})</td>
                <td className="text-right text-[18px] font-bold text-[#E89B55] max-[540px]:text-[14px]">{formatEth(multiplyEth(nft.price, quantity), 2)} ETH</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Taxa e total vêm da mesma seleção capturada no pagamento. */}
        <dl className="ml-auto grid w-[320px] max-w-full grid-cols-[1fr_auto] gap-x-4 gap-y-3 text-[16px] leading-4">
          {order.discount !== "0" && <><dt>Desconto</dt><dd className="text-right text-[18px]">{formatEth(order.discount, 3)} ETH</dd></>}
          <dt>Taxa de rede</dt><dd className="text-right text-[18px]">{formatEth(order.networkFee, 3)} ETH</dd>
          <dt className="font-bold">Total</dt><dd className="text-right text-[18px] font-bold text-[#E89B55]">{formatEth(order.total, 3)} ETH</dd>
        </dl>

        {/* A confirmação identifica a simulação; não aponta para um explorador real. */}
        <div className="mt-auto flex flex-col items-center gap-5 border-t border-[#61452F] pt-3">
          <p id="order-confirmation-description" className="text-center text-[14px] leading-[22px] text-[#CFB28C]">Pedido confirmado na simulação. Referência: <span className="break-all">{order.id}</span>. Nenhuma transação foi enviada à blockchain.</p>
          <button type="button" disabled title="Referência simulada: não existe transação no Etherscan" className="flex h-12 items-center justify-center rounded-[5px] bg-[#D28A4C] px-4 text-[16px] font-bold text-[#140D0A] disabled:cursor-not-allowed">Etherscan indisponível na simulação</button>
        </div>
      </section>
    </dialog>
  );
}
