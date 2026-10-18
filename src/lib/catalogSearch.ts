import type { CatalogParams, Network } from "../api/contracts.ts";
import { isEth } from "./money.ts";

/** Normaliza parâmetros externos sem deixar valores inválidos chegarem à consulta. */
export function catalogSearch(search: Record<string, unknown>): CatalogParams & { mockScenario?: string } {
  // sort aceita somente critérios conhecidos; valores externos inválidos deixam a API usar a ordem padrão.
  const sort = ["recent", "popular", "price-asc", "price-desc"].includes(String(search.sort)) ? search.sort as CatalogParams["sort"] : undefined;
  // page converte a entrada da URL para número antes de verificar se é uma página inteira e positiva.
  const page = Number(search.page);
  return {
    q: typeof search.q === "string" && search.q.trim() ? search.q.trim().slice(0, 120) : undefined,
    collection: typeof search.collection === "string" && search.collection ? search.collection : undefined,
    network: ["Ethereum", "Polygon", "Solana"].includes(String(search.network)) ? search.network as Network : undefined,
    maxPrice: isEth(String(search.maxPrice)) ? String(search.maxPrice) : undefined,
    sort, page: Number.isSafeInteger(page) && page > 0 ? page : 1,
    mockScenario: typeof search.mockScenario === "string" ? search.mockScenario : undefined,
  };
}
