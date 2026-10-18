import { queryOptions } from "@tanstack/react-query";
import { api } from "./http.ts";
import type { CatalogParams, CatalogResponse, CatalogNFT } from "./contracts.ts";

/** A chave inclui todos os parâmetros; o sinal cancela consultas obsoletas. */
export function catalogQueryOptions(params: CatalogParams = {}) {
  return queryOptions({
    queryKey: ["nfts", "list", params],
    queryFn: async ({ signal }) => (await api.get<CatalogResponse>("/nfts", { params, signal })).data,
  });
}

// Define a consulta de um NFT pelo identificador e o tratamento de falhas sem repetição automática.
export function nftQueryOptions(id: string) {
  return queryOptions({
    queryKey: ["nfts", "detail", id],
    queryFn: async ({ signal }) => (await api.get<CatalogNFT>(`/nfts/${encodeURIComponent(id)}`, { signal })).data,
    retry: false,
  });
}
