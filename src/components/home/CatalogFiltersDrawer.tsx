import { useEffect, useRef, useState } from "react";
import { trapDialogTab } from "@/lib/dialogFocus";
import { useModalInert } from "@/lib/useModalInert";
import { useCatalogFilters } from "@/contexts/catalog-filter-store";
import type { Network } from "@/api/contracts";

// initialPrice inicia o preço do rascunho; onApply aplica esse valor e onClose fecha a gaveta.
type Props = { initialPrice: number | null; onApply: (value: number | null) => void; onClose: () => void };

/** Gaveta do filtro de preço existente; o diálogo nativo mantém foco e fundo inerte. */
export function CatalogFiltersDrawer({ initialPrice, onApply, onClose }: Props) {
  // params contém os filtros aplicados na URL; update confirma as novas escolhas no catálogo.
  const { params, update } = useCatalogFilters();
  // collection guarda a coleção ainda em edição; setCollection altera somente o rascunho até aplicar.
  const [collection, setCollection] = useState(params.collection ?? "");
  // network guarda a rede ainda em edição; setNetwork preserva a escolha sem disparar a consulta antes da confirmação.
  const [network, setNetwork] = useState(params.network ?? "");
  // dialogRef referencia o diálogo nativo para abertura, foco e fechamento por teclado.
  const dialogRef = useRef<HTMLDialogElement>(null);
  useModalInert(dialogRef);
  // draftPrice só altera a consulta quando o usuário confirma o filtro.
  const [draftPrice, setDraftPrice] = useState(initialPrice ?? 12.3);
  // Abre a gaveta como modal e restaura foco e rolagem quando a camada é desmontada.
  useEffect(() => {
    // dialog é a instância nativa referenciada para chamar showModal e close.
    const dialog = dialogRef.current;
    // previousFocus conserva o acionador para devolver o foco depois de fechar a gaveta.
    const previousFocus = document.activeElement;
    // overflow conserva a regra de rolagem do fundo, restaurada na limpeza do efeito.
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog?.showModal();
    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, []);
  return <dialog ref={dialogRef} aria-labelledby="catalog-filter-title" onKeyDown={event => trapDialogTab(event, event.currentTarget)} onCancel={event => { event.preventDefault(); onClose(); }} className="fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-dvh w-[390px] max-w-full overflow-y-auto border-0 border-l border-[#8F6D4D] bg-[#241612] p-6 text-[#F5F1EB] backdrop:bg-black/60">
    <div className="mb-8 flex items-center justify-between gap-4"><h2 id="catalog-filter-title" className="text-[20px] font-bold">Filtrar NFTs</h2><button type="button" aria-label="Fechar filtros" onClick={onClose} className="flex size-11 items-center justify-center rounded-full text-[24px] text-[#E89B55]">×</button></div>
    <form onSubmit={event => { event.preventDefault(); update({ collection: collection || undefined, network: network ? network as Network : undefined, maxPrice: String(draftPrice) }); onClose(); }}>
      <label className="mb-5 flex flex-col gap-2">Coleção<select value={collection} onChange={event => setCollection(event.target.value)} className="min-h-11 rounded bg-[#140D0A] px-3 text-[#B39463]"><option value="">Todas</option>{["Arte digital", "Fotografia", "Música", "Arte 3D", "Colecionáveis", "Generativa", "Jogos", "Assinaturas", "Utilidade"].map(name => <option key={name}>{name}</option>)}</select></label>
      <label className="mb-6 flex flex-col gap-2">Rede<select value={network} onChange={event => setNetwork(event.target.value)} className="min-h-11 rounded bg-[#140D0A] px-3 text-[#B39463]"><option value="">Todas</option>{["Ethereum", "Polygon", "Solana"].map(name => <option key={name}>{name}</option>)}</select></label>
      <label htmlFor="drawer-max-price" className="mb-4 block text-[18px] font-bold">Preço máximo em ETH</label>
      <input id="drawer-max-price" type="range" min="0.02" max="12.3" step="0.01" value={draftPrice} onChange={event => setDraftPrice(Number(event.target.value))} aria-describedby="drawer-price-value" className="w-full accent-[#D28A4C]" />
      <p id="drawer-price-value" className="mt-3 text-[14px] text-[#CFB28C]">Até {draftPrice.toFixed(2).replace(".", ",")} ETH</p>
      <button type="submit" className="mt-8 min-h-11 w-full rounded-[6px] bg-[#D28A4C] px-4 font-bold text-[#140D0A]">Aplicar filtro</button>
      <button type="button" onClick={() => onApply(null)} className="mt-3 min-h-11 w-full text-[#E89B55] underline">Limpar filtro de preço</button>
    </form>
  </dialog>;
}
