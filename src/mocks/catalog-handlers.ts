import { http, HttpResponse } from "msw";
import { delay } from "msw";
import { createCatalog } from "./fixtures.ts";
import { compareEth, isEth } from "../lib/money.ts";
import { publishNFT } from "./events.ts";
import type { ApiErrorResponse, CatalogNFT, CatalogResponse, MockScenario } from "../api/contracts.ts";

// Estado da API simulada, separado dos componentes e recriado pelo reset.
function restoreCatalog() {
  try {
    // saved representa os dados recuperados do armazenamento, que precisam de validação antes do uso.
    const saved = typeof localStorage !== "undefined" ? JSON.parse(localStorage.getItem("kurio-mock-catalog-v1") ?? "null") : null;
    if (Array.isArray(saved) && saved.length && saved.every(item => typeof item.id === "string" && isEth(item.price) && Array.isArray(item.editions))) {
      // Mantém preços/estoque salvos e migra somente a URL para o asset otimizado equivalente.
      const images = new Map(createCatalog().map(nft => [nft.id, nft.image]));
      return saved.map(item => ({ ...item, image: images.get(item.id) ?? item.image })) as CatalogNFT[];
    }
  } catch { /* Uma simulação inválida volta às fixtures determinísticas. */ }
  return createCatalog();
}
// catalog mantém os NFTs autoritativos da simulação, incluindo preços, versões e estoque.
let catalog = restoreCatalog();
// Restaura as fixtures do catálogo e remove as alterações persistidas da simulação.
export function resetCatalog() {
  catalog = createCatalog();
  if (typeof localStorage !== "undefined") localStorage.removeItem("kurio-mock-catalog-v1");
}
// Localiza o registro autoritativo de um NFT pelo identificador.
export function findCatalogNFT(id: string) { return catalog.find(nft => nft.id === id); }
// catalogSnapshot entrega o estado atual do catálogo ao transporte de eventos durante a reconexão.
export function catalogSnapshot() { return catalog; }
/** Único ponto de alteração: respostas REST e o futuro transporte de eventos usam o mesmo catálogo. */
export function updateCatalogNFT(id: string, patch: { price?: string; edition?: string; available?: number }) {
  // nft é o registro do catálogo usado como referência de preço, edição e disponibilidade.
  const nft = findCatalogNFT(id);
  if (!nft) return;
  if (patch.price !== undefined) nft.price = patch.price;
  if (patch.available !== undefined) nft.editions = nft.editions.map(item => item.edition === patch.edition ? { ...item, available: patch.available! } : item);
  nft.version++;
  if (typeof localStorage !== "undefined") localStorage.setItem("kurio-mock-catalog-v1", JSON.stringify(catalog));
  publishNFT(nft);
  return nft;
}

// errorResponse constrói o formato tipado de erro devolvido pelas rotas do catálogo.
const errorResponse = (status: number, code: string, message: string) => HttpResponse.json<ApiErrorResponse>({ error: { code, message } }, { status });

/** Configuração reproduzível via header de teste ou ?mockScenario=slow na demonstração. */
export function scenarioFor(request: Request): MockScenario {
  // fromBrowser lê o cenário solicitado na URL quando o handler roda no navegador.
  const fromBrowser = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("mockScenario") : null;
  return (request.headers.get("x-kurio-scenario") ?? fromBrowser ?? "default") as MockScenario;
}

// Aplica a latência e as falhas reproduzíveis às consultas do catálogo.
async function simulateNetwork(request: Request) {
  // scenario seleciona a condição reproduzível de rede ou de negócio solicitada no teste.
  const scenario = scenarioFor(request);
  // q é o termo da busca usado para filtrar o catálogo ou simular atrasos de respostas.
  const q = new URL(request.url).searchParams.get("q") ?? "";
  await delay(scenario === "slow" ? 1800 : scenario === "out-of-order" ? (q.length < 3 ? 1000 : 100) : 150);
  if (scenario === "offline") return HttpResponse.error();
  if (scenario === "error") return errorResponse(503, "TEMPORARY_UNAVAILABLE", "O catálogo está temporariamente indisponível. Tente novamente.");
}

// catalogHandlers registra as rotas simuladas de listagem, detalhe e controle do catálogo.
export const catalogHandlers = [
  // Controle exclusivo do mock: a mesma alteração será consumida pelos eventos no bloco de Socket.IO.
  http.post("*/api/mock/nfts/:id", async ({ request, params }) => {
    // nft é o registro do catálogo usado como referência de preço, edição e disponibilidade.
    const nft = findCatalogNFT(String(params.id));
    if (!nft) return errorResponse(404, "NFT_NOT_FOUND", "NFT não encontrado.");
    // patch contém somente as alterações solicitadas ao controle de catálogo do mock.
    const patch = await request.json() as { price?: unknown; edition?: unknown; available?: unknown };
    if (!patch || (patch.price !== undefined && !isEth(patch.price)) ||
      (patch.available !== undefined && (!Number.isSafeInteger(patch.available) || Number(patch.available) < 0 || !nft.editions.some(item => item.edition === patch.edition)))) return errorResponse(422, "VALIDATION_ERROR", "Alteração de catálogo inválida.");
    updateCatalogNFT(nft.id, { price: isEth(patch.price) ? patch.price : undefined, edition: typeof patch.edition === "string" ? patch.edition : undefined, available: typeof patch.available === "number" ? patch.available : undefined });
    return HttpResponse.json(nft);
  }),
  // Reinicia os dados para que demonstrações e testes partam do mesmo catálogo.
  http.post("*/api/mock/reset", () => {
    resetCatalog();
    return new HttpResponse(null, { status: 204 });
  }),
  // Combina os parâmetros da URL para filtrar, ordenar e paginar o catálogo na camada de rede.
  http.get("*/api/nfts", async ({ request }) => {
    // failure contém uma eventual falha simulada; quando presente, interrompe a operação antes de alterar dados.
    const failure = await simulateNetwork(request);
    if (failure) return failure;
    // params permite ler os parâmetros de busca enviados na URL da requisição.
    const params = new URL(request.url).searchParams;
    // page é o número da página solicitada, começando em 1.
    const page = Number(params.get("page") ?? "1");
    // pageSize limita a quantidade de itens devolvidos por página e é validado pela API.
    const pageSize = Number(params.get("pageSize") ?? "9");
    // maxPrice é o teto de preço recebido como texto decimal e validado antes da comparação.
    const maxPrice = params.get("maxPrice");
    // network contém a rede selecionada para restringir os resultados do catálogo.
    const network = params.get("network");
    // sort determina a ordenação solicitada na consulta, usando a opção padrão quando ausente.
    const sort = params.get("sort") ?? "recent";
    if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 50 ||
      (maxPrice !== null && !isEth(maxPrice)) || (network !== null && !["Ethereum", "Polygon", "Solana"].includes(network)) ||
      !["recent", "popular", "price-asc", "price-desc"].includes(sort)) {
      return errorResponse(422, "VALIDATION_ERROR", "Parâmetros de catálogo inválidos.");
    }
    // q é o termo da busca usado para filtrar o catálogo ou simular atrasos de respostas.
    const q = (params.get("q") ?? "").trim().toLocaleLowerCase("pt-BR");
    // collection contém o nome da coleção usada como filtro da consulta.
    const collection = params.get("collection");
    // items reúne os NFTs que satisfazem os filtros antes da ordenação e do recorte da página.
    let items = scenarioFor(request) === "empty" ? [] : catalog.filter((nft) =>
      (!q || `${nft.name} ${nft.id}`.toLocaleLowerCase("pt-BR").includes(q)) &&
      (!collection || nft.collection === collection) && (!network || nft.network === network) &&
      (maxPrice === null || compareEth(nft.price, maxPrice) <= 0));
    items = [...items].sort((a, b) => {
      if (sort === "price-asc") return compareEth(a.price, b.price) || a.id.localeCompare(b.id);
      if (sort === "price-desc") return compareEth(b.price, a.price) || a.id.localeCompare(b.id);
      if (sort === "popular") return b.popularity - a.popularity || a.id.localeCompare(b.id);
      return b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id);
    });
    // As contagens globais mantêm os filtros coerentes com os dados disponíveis.
    const facets = { collections: {} as Record<string, number>, networks: {} as Record<string, number> };
    // nft representa cada recurso do catálogo utilizado para somar as contagens reais de coleção e rede.
    for (const nft of catalog) {
      facets.collections[nft.collection] = (facets.collections[nft.collection] ?? 0) + 1;
      facets.networks[nft.network] = (facets.networks[nft.network] ?? 0) + 1;
    }
    return HttpResponse.json<CatalogResponse>({ items: items.slice((page - 1) * pageSize, page * pageSize), total: items.length, page, pageSize, pages: Math.ceil(items.length / pageSize), facets });
  }),
  // Resolve params.id no catálogo e diferencia detalhe existente de erro 404.
  http.get("*/api/nfts/:id", async ({ request, params }) => {
    // failure contém uma eventual falha simulada; quando presente, interrompe a operação antes de alterar dados.
    const failure = await simulateNetwork(request);
    if (failure) return failure;
    // nft é o registro do catálogo usado como referência de preço, edição e disponibilidade.
    const nft = catalog.find((item) => item.id === params.id);
    return nft ? HttpResponse.json<CatalogNFT>(nft) : errorResponse(404, "NFT_NOT_FOUND", "NFT não encontrado.");
  }),
  // Limita o fallback à API na raiz da origem. O curinga anterior também capturava
  // /src/api/*.ts do Vite e bloqueava as importações no modo de desenvolvimento.
  http.all(/^https?:\/\/[^/]+\/api(?:\/|$)/, () => errorResponse(501, "NOT_IMPLEMENTED", "Endpoint ainda não implementado.")),
];
