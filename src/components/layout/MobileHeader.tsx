import { CatalogSearch } from "@/components/home/CatalogSearch";
import { useCatalogFilters } from "@/contexts/catalog-filter-store";
// Apresenta busca, filtros e acesso à conta no cabeçalho mobile.
export function MobileHeader({ onLoginClick, onFiltersClick, accountLabel = "Entrar", accountLoading = false }: { onLoginClick: () => void; onFiltersClick: () => void; accountLabel?: string; accountLoading?: boolean }) {
  // params fornece o termo de busca atual para manter o cabeçalho mobile sincronizado com a URL.
  const { params } = useCatalogFilters();
  return (
    // O cabeçalho aparece somente na versão mobile.
    // No frame de 414px, a largura útil é de 366px.
    <div className="flex w-full flex-wrap items-center gap-2 md:hidden">
      {/* Campo de pesquisa:
          313 × 45px no Figma, com padding de 12px,
          raio de 10px e espaçamento interno de 10px. */}
      <div
        className="
          flex h-[45px] min-w-0 flex-1 items-center
          gap-[10px] rounded-[10px] bg-[#241612] p-3
        "
      >
        <CatalogSearch key={params.q ?? ""} compact />
      </div>

      {/* Botão de filtros:
          45 × 45px, raio de 14px e padding de 12px.
          O sentido do gradiente ainda é provisório. */}
      <button
        type="button"
        aria-label="Abrir filtros"
        aria-haspopup="dialog"
        onClick={onFiltersClick}
        className="
          flex h-[45px] w-[45px] shrink-0
          cursor-pointer items-center justify-center
          rounded-[14px] p-3
          bg-linear-to-b from-[#D28A4C]/45 to-[#D28A4C]
        "
      >
        {/* Ícone original exportado do Figma. */}
        <img
          src="/icons/Filter.svg"
          alt=""
          aria-hidden="true"
          className="h-[21px] w-[21px]"
        />
      </button>
      <button type="button" onClick={onLoginClick} disabled={accountLoading} aria-busy={accountLoading} className="ml-auto flex min-h-11 items-center gap-2 rounded-[10px] bg-[#D28A4C] px-4 text-[14px] font-medium text-[#140D0A]">
        <img src="/icons/login.png" alt="" aria-hidden="true" className="h-[18px] w-[18px]" />
        {accountLabel}
      </button>
    </div>
  );
}
