import { useState } from "react";
import { useCatalogFilters } from "@/contexts/catalog-filter-store";
import type { CatalogResponse, Network } from "@/api/contracts";

// Coleções e quantidades exibidas no Figma.
const collections = [
  { name: "Arte digital", count: 33 },
  { name: "Fotografia", count: 12 },
  { name: "Música", count: 65 },
  { name: "Arte 3D", count: 39 },
  { name: "Colecionáveis", count: 23 },
  { name: "Generativa", count: 17 },
  { name: "Jogos", count: 19 },
  { name: "Assinaturas", count: 13 },
  { name: "Utilidade", count: 18 },
];

// Redes e quantidades exibidas no Figma.
const networks = [
  { name: "Ethereum", count: 119 },
  { name: "Polygon", count: 78 },
  { name: "Solana", count: 86 },
];

// Função recebida do catálogo para aplicar o filtro de preço.
type CatalogSidebarProps = {
  onApplyPrice: (maxPrice: number) => void;
  facets?: CatalogResponse["facets"];
};

// CatalogSidebar recebe a aplicação do preço e as contagens reais de coleção e rede retornadas pela API.
export function CatalogSidebar({ onApplyPrice, facets }: CatalogSidebarProps) {
  // params identifica os filtros ativos; update combina as escolhas da barra lateral na URL.
  const { params, update } = useCatalogFilters();
  // Guarda a coleção selecionada.
  const selectedCollection = params.collection;

  // Guarda o preço máximo escolhido no controle deslizante.
  const [maxPrice, setMaxPrice] = useState(Number(params.maxPrice ?? 12.3));

  return (
    <aside
      aria-label="Filtros do catálogo"
      className="hidden h-fit bg-[#241612] p-4 md:block"
    >
      {/* Seção de coleções. */}
      <section>
        <h2 className="mb-4 text-[18px] leading-[16px] font-bold text-[#F5F1EB]">
          Coleções
        </h2>

        <div className="flex flex-col">
          {collections.map((collection) => {
            // Verifica se esta coleção está selecionada.
            const isSelected = selectedCollection === collection.name;

            return (
              <button
                key={collection.name}
                type="button"
                aria-pressed={isSelected}
                onClick={() => update({ collection: isSelected ? undefined : collection.name })}
                className={`flex min-h-10 w-full items-center justify-between gap-3 text-left text-[15px] leading-[40px] font-normal ${
                  isSelected ? "text-[#E89B55]" : "text-[#CFB28C]"
                }`}
              >
                <span>{collection.name}</span>
                <span>({facets?.collections[collection.name] ?? "—"})</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Seção de filtro por preço. */}
      <section className="mt-5">
        <h2 className="mb-3 text-[18px] leading-[16px] font-bold text-[#F5F1EB]">
          Faixa de preço
        </h2>

        {/* Permite escolher o preço máximo em ETH. */}
        <input
          type="range"
          min={0.02}
          max={12.3}
          step={0.01}
          value={maxPrice}
          onChange={(event) => setMaxPrice(Number(event.target.value))}
          aria-label="Preço máximo em ETH"
          className="w-full accent-[#D28A4C]"
        />

        {/* Exibe o intervalo de preço escolhido. */}
        <p className="mt-2 text-[12px] text-[#F5F1EB]">
          Preço: 0,02 - {maxPrice.toFixed(2).replace(".", ",")} ETH
        </p>

        {/* Envia o valor selecionado para o catálogo. */}
        <button
          type="button"
          onClick={() => onApplyPrice(maxPrice)}
          className="mt-3 rounded bg-[#D28A4C] px-4 py-2 text-[12px] font-bold text-[#140D0A]"
        >
          Aplicar
        </button>
      </section>

      {/* Seção de redes blockchain. */}
      <section className="mt-5">
        <h2 className="mb-4 text-[18px] leading-[16px] font-bold text-[#F5F1EB]">
          Rede
        </h2>

        <div className="flex flex-col gap-3">
          {networks.map((network) => (
            <button
              key={network.name}
              type="button"
              aria-pressed={params.network === network.name}
              onClick={() => update({ network: params.network === network.name ? undefined : network.name as Network })}
              className={`flex min-h-10 justify-between gap-3 text-[15px] ${params.network === network.name ? "text-[#E89B55]" : "text-[#CFB28C]"}`}
            >
              <span>{network.name}</span>
              <span>({facets?.networks[network.name] ?? "—"})</span>
            </button>
          ))}
        </div>
      </section>
    </aside>
  );
}
