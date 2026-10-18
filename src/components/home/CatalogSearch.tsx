import { useState } from "react";
import { useCatalogFilters } from "@/contexts/catalog-filter-store";

/** O texto digitado só vira filtro ao enviar, evitando uma entrada no histórico por letra. */
export function CatalogSearch({ compact = false }: { compact?: boolean }) {
  // params fornece a busca aplicada; update grava a nova consulta na URL ao submeter.
  const { params, update } = useCatalogFilters();
  // text guarda o texto digitado antes do envio; setText evita criar uma navegação por tecla.
  const [text, setText] = useState(params.q ?? "");
  return <form role="search" aria-label="Buscar NFTs" onSubmit={event => { event.preventDefault(); update({ q: text.trim() || undefined }); }} className={`flex min-w-0 flex-1 items-center gap-2 ${compact ? "" : "rounded-[10px] bg-[#241612] p-3"}`}>
    <input id={compact ? "mobile-catalog-search" : "catalog-search"} aria-label="Buscar NFTs por nome ou identificador" value={text} onChange={event => setText(event.target.value)} placeholder="Explorar coleções" className="min-w-0 flex-1 border-0 bg-transparent text-[14px] text-[#F5F1EB] placeholder:text-[#B39463]" />
    <button type="submit" aria-label="Executar busca" className="flex min-h-8 min-w-8 items-center justify-center"><img src="/icons/Search.svg" alt="" className="size-5" /></button>
  </form>;
}
