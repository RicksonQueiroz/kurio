import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import axios from "axios";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { catalogHandlers } from "../src/mocks/catalog-handlers.ts";
import { compareEth } from "../src/lib/money.ts";
import type { CatalogResponse } from "../src/api/contracts.ts";

// Exercita requisições HTTP reais do Axios interceptadas pelo mesmo contrato da demonstração.
const server = setupServer(...catalogHandlers,
  // Representa o arquivo servido pelo Vite depois dos handlers da API.
  http.get("http://kurio.test/src/api/auth.ts", () => new HttpResponse("export const sourceModule = true;", { headers: { "Content-Type": "text/javascript" } })),
);
// client é o Axios de teste que envia HTTP aos handlers MSW; não acessa o cache da interface.
const client = axios.create({ baseURL: "http://kurio.test/api" });
// Ativa a interceptação MSW antes dos cenários; requisições não previstas devem falhar em vez de atingir a rede externa.
before(() => server.listen({ onUnhandledRequest: "error" }));
// Encerra a interceptação ao terminar a suíte, liberando os recursos do servidor de testes.
after(() => server.close());

// Cenário de regressão: fallback da API não intercepta módulos de desenvolvimento em /src/api.
test("fallback da API não intercepta módulos de desenvolvimento em /src/api", async () => {
  // module contém a resposta JavaScript de desenvolvimento, que não pode ser confundida com um endpoint desconhecido.
  const module = await axios.get("http://kurio.test/src/api/auth.ts");
  assert.match(module.headers["content-type"], /javascript/);
  assert.equal(module.data, "export const sourceModule = true;");
  await assert.rejects(client.get("/endpoint-inexistente"), (error: unknown) => axios.isAxiosError(error) && error.response?.status === 501);
});

// Cenário de regressão: catálogo pagina sem repetir itens e mantém ETH como texto.
test("catálogo pagina sem repetir itens e mantém ETH como texto", async () => {
  // first é a primeira página devolvida pela API, usada como referência de paginação.
  const first = (await client.get<CatalogResponse>("/nfts")).data;
  // second é a segunda página, comparada à primeira para detectar itens repetidos.
  const second = (await client.get<CatalogResponse>("/nfts", { params: { page: 2 } })).data;
  assert.equal(first.items.length, 9);
  assert.ok(first.total >= 30);
  assert.ok(second.items.every(item => !first.items.some(other => other.id === item.id)));
  assert.equal(typeof first.items[0].price, "string");
  // detail é a resposta do detalhe do NFT escolhido na página seguinte.
  const detail = (await client.get(`/nfts/${second.items[0].id}`)).data;
  assert.equal(detail.id, second.items[0].id);
});

// Cenário de regressão: filtros e ordenação usam valores monetários exatos.
test("filtros e ordenação usam valores monetários exatos", async () => {
  // data contém o corpo tipado da resposta HTTP observado neste teste.
  const { data } = await client.get<CatalogResponse>("/nfts", { params: { maxPrice: "2", sort: "price-asc", network: "Ethereum", pageSize: 50 } });
  assert.ok(data.items.length > 0);
  assert.ok(data.items.every(item => item.network === "Ethereum" && compareEth(item.price, "2") <= 0));
  assert.ok(data.items.every((item, index) => index === 0 || compareEth(data.items[index - 1].price, item.price) <= 0));
});

// Cenário de regressão: erros, vazio e recuperação são reproduzíveis.
test("erros, vazio e recuperação são reproduzíveis", async () => {
  await assert.rejects(client.get("/nfts", { params: { page: 0 } }), (error: unknown) => axios.isAxiosError(error) && error.response?.status === 422);
  await assert.rejects(client.get("/nfts/inexistente"), (error: unknown) => axios.isAxiosError(error) && error.response?.status === 404);
  await assert.rejects(client.get("/nfts", { headers: { "x-kurio-scenario": "error" } }), (error: unknown) => axios.isAxiosError(error) && error.response?.status === 503);
  assert.equal((await client.get<CatalogResponse>("/nfts", { headers: { "x-kurio-scenario": "empty" } })).data.total, 0);
  assert.equal((await client.post("/mock/reset")).status, 204);
  assert.ok((await client.get<CatalogResponse>("/nfts")).data.total > 0);
});

// Cenário de regressão: requisição obsoleta pode ser cancelada pelo sinal.
test("requisição obsoleta pode ser cancelada pelo sinal", async () => {
  // controller permite cancelar explicitamente a consulta em andamento.
  const controller = new AbortController();
  // request é a promessa HTTP cuja rejeição deve ser reconhecida como cancelamento.
  const request = client.get("/nfts", { signal: controller.signal, headers: { "x-kurio-scenario": "slow" } });
  controller.abort();
  await assert.rejects(request, error => axios.isCancel(error));
});

