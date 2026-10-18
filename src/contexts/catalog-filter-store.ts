import { createContext, useContext } from "react";
import type { CatalogParams } from "@/api/contracts";

// CatalogFilterState expõe filtros da URL, atualização parcial e adaptação do preço para os controles.
type CatalogFilterState = { params: CatalogParams; update: (patch: Partial<CatalogParams>, pageOnly?: boolean) => void; maxPrice: number | null; applyPrice: (value: number | null) => void };
// O mesmo preço aplicado é consumido pela barra desktop e pela gaveta mobile.
export const CatalogFilterContext = createContext<CatalogFilterState | null>(null);
// useCatalogFilters permite consumir o estado de filtros e exige o provedor do layout principal.
export function useCatalogFilters() {
  // context é o valor encontrado na árvore React, com filtros e ações compartilhados.
  const context = useContext(CatalogFilterContext);
  if (!context) throw new Error("useCatalogFilters requer CatalogFilterContext.");
  return context;
}
