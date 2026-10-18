import { useCatalogFilters } from "@/contexts/catalog-filter-store";
import { useQuery } from "@tanstack/react-query";

import { catalogQueryOptions } from "@/api/catalog";
import { apiErrorMessage } from "@/api/http";
import { Button } from "@/components/ui/button";
import { NFTCard } from "@/components/nft/NFTCard";
import { CatalogSidebar } from "@/components/home/CatalogSidebar";
import { FeaturedNFTBanner } from "@/components/home/FeaturedBanner";
import { CatalogSearch } from "./CatalogSearch";

// Consulta o catálogo e escolhe entre carregamento, erro, vazio ou lista de cards.
export function NFTCatalog() {
  // null significa que nenhum filtro de preço foi aplicado.
  const { params, update, applyPrice } = useCatalogFilters();

  // O filtro vai à API; a interface não contém respostas fictícias nem regras de listagem.
  const catalog = useQuery(catalogQueryOptions({ ...params, pageSize: 9 }));
  // filteredNFTs recebe os itens já filtrados pela API, sem refazer a regra de negócio no componente.
  const filteredNFTs = catalog.data?.items ?? [];

  return (
    <section
      id="catalogo"
      aria-label="Catálogo de NFTs"
      className="mx-auto mt-6 w-full max-w-[1200px]"
    >
      <h2 className="sr-only">Catálogo de NFTs</h2>
      <div className="md:grid md:grid-cols-[240px_minmax(0,1fr)] md:gap-6 lg:grid-cols-[310px_minmax(0,1fr)]">
        {" "}
        {/* Barra lateral visível somente no desktop. */}
        {/* Coluna lateral com filtros e NFT em destaque.
    O espaço de 24px foi confirmado no Figma. */}
        <div className="hidden flex-col gap-6 md:flex">
          <CatalogSidebar key={params.maxPrice ?? "all"} onApplyPrice={applyPrice} facets={catalog.data?.facets} />
          <FeaturedNFTBanner />
        </div>{" "}
        <div className="min-w-0">
          <div className="mb-5 hidden md:flex"><CatalogSearch key={params.q ?? ""} /></div>
          {/* Abas visuais do catálogo. */}
          <div className="mb-5 flex gap-4 overflow-x-auto text-[12px] whitespace-nowrap">
            <button onClick={() => update({ sort: undefined })} aria-pressed={!params.sort} className={`pb-2 ${!params.sort ? "border-b border-[#D28A4C] font-bold text-[#D28A4C]" : "text-[#F5F1EB]"}`}>
              Todos os NFTs
            </button>

            <button onClick={() => update({ sort: "recent" })} aria-pressed={params.sort === "recent"} className="pb-2 text-[#F5F1EB]">Novos lançamentos</button>

            <button onClick={() => update({ sort: "popular" })} aria-pressed={params.sort === "popular"} className="pb-2 text-[#F5F1EB]">Em alta</button>
          </div>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 text-[12px] text-[#CFB28C]">
            <label className="flex items-center gap-2">Ordenar<select aria-label="Ordenar NFTs" value={params.sort ?? "recent"} onChange={event => update({ sort: event.target.value as typeof params.sort })} className="min-h-10 rounded border border-[#8F6D4D] bg-[#241612] px-2 text-[#B39463]"><option value="recent">Mais recentes</option><option value="popular">Mais populares</option><option value="price-asc">Menor preço</option><option value="price-desc">Maior preço</option></select></label>
            <button onClick={() => update({ q: undefined, collection: undefined, network: undefined, maxPrice: undefined, sort: undefined })} className="min-h-10 text-[#E89B55] underline">Limpar filtros</button>
          </div>

          {/* Cards organizados em duas ou três colunas. */}
          {catalog.isPending && (
            <div role="status" aria-label="Carregando catálogo" className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-2 lg:grid-cols-3 md:gap-x-8 md:gap-y-10">
              {Array.from({ length: 9 }, (_, index) => <div key={index} aria-hidden="true" className="flex min-w-0 flex-col gap-3 md:max-w-[258px]"><div className="catalog-skeleton aspect-[258/300] w-full" /><div className="catalog-skeleton h-4 w-3/4" /><div className="catalog-skeleton h-[18px] w-1/3" /></div>)}
            </div>
          )}
          {catalog.isError && <div role="alert" className="rounded-[10px] bg-[#241612] p-6 text-[14px] text-[#CFB28C]"><p>{apiErrorMessage(catalog.error)}</p><Button onClick={() => void catalog.refetch()} className="mt-4 bg-[#D28A4C] text-[#140D0A] hover:bg-[#E89B55]">Tentar novamente</Button></div>}
          {!catalog.isPending && !catalog.isError && <div aria-busy={catalog.isFetching} className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-2 lg:grid-cols-3 md:gap-x-8 md:gap-y-10">
            {filteredNFTs.map((nft) => (
              <NFTCard key={nft.id} nft={nft} />
            ))}
          </div>}

          {/* Mensagem exibida quando nenhum NFT corresponde ao filtro. */}
          {!catalog.isPending && !catalog.isError && filteredNFTs.length === 0 && (
            <p className="mt-8 text-[#F5F1EB]">
              Nenhum NFT encontrado com os filtros selecionados.
            </p>
          )}
          {catalog.data && !catalog.isError && <nav aria-label="Paginação do catálogo" className="mt-8 flex flex-wrap items-center justify-center gap-4 text-[14px] text-[#CFB28C]">
            <button disabled={(params.page ?? 1) <= 1 || catalog.isFetching} onClick={() => update({ page: (params.page ?? 1) - 1 }, true)} className="min-h-11 rounded border border-[#8F6D4D] px-3">Anterior</button>
            <span role="status">Página {params.page ?? 1} de {Math.max(1, catalog.data.pages)} · {catalog.data.total} NFTs</span>
            <button disabled={(params.page ?? 1) >= catalog.data.pages || catalog.isFetching} onClick={() => update({ page: (params.page ?? 1) + 1 }, true)} className="min-h-11 rounded border border-[#8F6D4D] px-3">Próxima</button>
          </nav>}
        </div>
      </div>
    </section>
  );
}
