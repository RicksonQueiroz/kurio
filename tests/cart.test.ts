import { before, after, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import axios from "axios";
import { setupServer } from "msw/node";
import { authHandlers } from "../src/mocks/auth-handlers.ts";
import { cartHandlers } from "../src/mocks/cart-handlers.ts";
import { catalogHandlers } from "../src/mocks/catalog-handlers.ts";
import type { AuthResponse, CartResponse } from "../src/api/contracts.ts";

// server intercepta as chamadas de autenticação, carrinho e catálogo com os handlers reais da simulação.
const server = setupServer(...authHandlers, ...cartHandlers, ...catalogHandlers);
// client é o Axios de teste que envia HTTP aos handlers MSW; não acessa o cache da interface.
const client = axios.create({ baseURL: "http://kurio.test/api", headers: { "x-kurio-guest": "visitor-test-0001" } });
// line define a seleção base de um Emerald Ape na edição 1/50.
const line = { nftId: "042", edition: "1/50", quantity: 1 };
// status gera a validação do status HTTP esperado em cada falha simulada.
const status = (expected: number) => (error: unknown) => axios.isAxiosError(error) && error.response?.status === expected;
// Ativa a interceptação MSW antes dos cenários; requisições não previstas devem falhar em vez de atingir a rede externa.
before(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(async () => { await client.post("/mock/reset"); });
// Encerra a interceptação ao terminar a suíte, liberando os recursos do servidor de testes.
after(() => server.close());

// O preço da requisição não pode alterar a cotação que o servidor calcula a partir do catálogo.
test("carrinho adiciona, edita, remove e ignora preços enviados pelo cliente", async () => {
  // added é a resposta após inclusão, usada para conferir o preço autoritativo.
  const added = (await client.post<CartResponse>("/cart/items", { ...line, price: "0.001" })).data;
  assert.equal(added.quote.subtotal, "1.19");
  assert.equal(added.quote.total, "1.206");
  // changed é a resposta após substituir a quantidade, usada para conferir o novo subtotal.
  const changed = (await client.patch<CartResponse>("/cart/items", { ...line, quantity: 3 })).data;
  assert.equal(changed.quote.subtotal, "3.57");
  assert.equal((await client.get<CartResponse>("/cart")).data.items[0].quantity, 3);
  // removed é a resposta após remoção, usada para conferir o estado vazio e a taxa zero.
  const removed = (await client.delete<CartResponse>("/cart/items/042/1%2F50")).data;
  assert.equal(removed.items.length, 0);
  assert.equal(removed.quote.total, "0");
  assert.equal(removed.quote.networkFee, "0");
  assert.equal(removed.quote.valid, false);
});

// Cenário de regressão: cupom tem cálculo exato, remoção, conflito inválido e expirado sem perder o cupom válido.
test("cupom tem cálculo exato, remoção, conflito inválido e expirado sem perder o cupom válido", async () => {
  await client.post("/cart/items", line);
  // applied é a cotação com cupom válido, usada para conferir desconto e total exatos.
  const applied = (await client.post<CartResponse>("/cart/coupon", { code: " kurio10 " })).data;
  assert.equal(applied.quote.discount, "0.119");
  assert.equal(applied.quote.total, "1.087");
  await assert.rejects(client.post("/cart/coupon", { code: "INVALIDO" }), status(422));
  await assert.rejects(client.post("/cart/coupon", { code: "EXPIRADO" }), status(410));
  assert.equal((await client.get<CartResponse>("/cart")).data.quote.coupon, "KURIO10");
  assert.equal((await client.delete<CartResponse>("/cart/coupon")).data.quote.total, "1.206");
});

// Cenário de regressão: estoque, edição e quantidade inválida não alteram o carrinho.
test("estoque, edição e quantidade inválida não alteram o carrinho", async () => {
  await assert.rejects(client.post("/cart/items", { ...line, quantity: 51 }), status(409));
  await assert.rejects(client.post("/cart/items", { ...line, quantity: 1.5 }), status(422));
  await assert.rejects(client.post("/cart/items", { ...line, edition: "1/999" }), status(422));
  await assert.rejects(client.post("/cart/items", { ...line, nftId: "inexistente" }), status(404));
  assert.equal((await client.get<CartResponse>("/cart")).data.items.length, 0);
});

// Cenário de regressão: login mescla visitante uma vez e mantém contas isoladas.
test("login mescla visitante uma vez e mantém contas isoladas", async () => {
  await client.post("/cart/items", line);
  await client.post("/cart/coupon", { code: "KURIO10" });
  // nova é a sessão da conta Nova, que deve receber os itens do visitante.
  const nova = (await client.post<AuthResponse>("/auth/login", { email: "nova@example.com", password: "Kurio123!" })).data;
  // novaHeaders envia o token de Nova sem trocar a identidade do visitante nos demais testes.
  const novaHeaders = { Authorization: `Bearer ${nova.token}` };
  assert.equal((await client.get<CartResponse>("/cart", { headers: novaHeaders })).data.items[0].quantity, 1);
  assert.equal((await client.get<CartResponse>("/cart", { headers: novaHeaders })).data.quote.total, "1.087");
  assert.equal((await client.get<CartResponse>("/cart")).data.items.length, 0);
  await client.post("/auth/login", { email: "nova@example.com", password: "Kurio123!" });
  assert.equal((await client.get<CartResponse>("/cart", { headers: novaHeaders })).data.items[0].quantity, 1);
  // sage é a sessão da outra conta, que não deve receber os itens privados de Nova.
  const sage = (await client.post<AuthResponse>("/auth/login", { email: "sage@example.com", password: "Kurio123!" })).data;
  assert.equal((await client.get<CartResponse>("/cart", { headers: { Authorization: `Bearer ${sage.token}` } })).data.items.length, 0);
  await client.post("/auth/expire", {}, { headers: novaHeaders });
  await assert.rejects(client.get("/cart", { headers: novaHeaders }), status(401));
});

// Cenário de regressão: redução de uma seleção antiga continua possível depois de queda de estoque.
test("redução de uma seleção antiga continua possível depois de queda de estoque", async () => {
  await client.post("/cart/items", { ...line, quantity: 3 });
  await client.post("/mock/nfts/042", { edition: "1/50", available: 1 });
  // reducing é o carrinho ainda acima do estoque enquanto o usuário reduz uma seleção antiga.
  const reducing = (await client.patch<CartResponse>("/cart/items", { ...line, quantity: 2 })).data;
  assert.equal(reducing.items[0].quantity, 2);
  assert.equal(reducing.quote.valid, false);
  // valid é a resposta depois de ajustar a quantidade ao estoque, liberando novamente a cotação.
  const valid = (await client.patch<CartResponse>("/cart/items", line)).data;
  assert.equal(valid.quote.valid, true);
});

// Cenário de regressão: falha de mutation preserva a última cotação e os itens.
test("falha de mutation preserva a última cotação e os itens", async () => {
  await client.post("/cart/items", line);
  await assert.rejects(client.patch("/cart/items", { ...line, quantity: 3 }, { headers: { "x-kurio-scenario": "error" } }), status(503));
  // restored é a leitura confirmada da API depois de uma escrita que falhou.
  const restored = (await client.get<CartResponse>("/cart")).data;
  assert.equal(restored.items[0].quantity, 1);
  assert.equal(restored.quote.total, "1.206");
});

// Cenário de regressão: cotação muda com o catálogo e bloqueia compra sem disponibilidade.
test("cotação muda com o catálogo e bloqueia compra sem disponibilidade", async () => {
  // before é a cotação anterior à mudança de preço e disponibilidade.
  const before = (await client.post<CartResponse>("/cart/items", line)).data;
  await client.post("/mock/nfts/042", { price: "1.25", edition: "1/50", available: 0 });
  // after é a cotação revalidada, que deve reconhecer preço novo e estoque insuficiente.
  const after = (await client.post<CartResponse>("/quote")).data;
  assert.equal(after.quote.subtotal, "1.25");
  assert.notEqual(after.quote.id, before.quote.id);
  assert.equal(after.quote.valid, false);
  assert.equal(after.items[0].quantity, 1);
  assert.ok(after.quote.issues.length > 0);
  assert.ok(after.notices.some(notice => notice.includes("preço")));
});
