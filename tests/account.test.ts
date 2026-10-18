import { before, after, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import axios from "axios";
import { setupServer } from "msw/node";
import { authHandlers } from "../src/mocks/auth-handlers.ts";
import { accountHandlers } from "../src/mocks/account-handlers.ts";
import { catalogHandlers } from "../src/mocks/catalog-handlers.ts";
import type { AuthResponse } from "../src/api/contracts.ts";

// server intercepta as chamadas REST de conta, autenticação e catálogo usando os handlers da aplicação.
const server = setupServer(...authHandlers, ...accountHandlers, ...catalogHandlers);
// client envia as requisições de teste à API simulada pelo mesmo transporte Axios.
const client = axios.create({ baseURL: "http://kurio.test/api" });
// headers receberá o token da conta autenticada no preparo de cada teste.
let headers: Record<string, string>;
// status cria a verificação do código HTTP esperado para as operações que devem falhar.
const status = (value: number) => (error: unknown) => axios.isAxiosError(error) && error.response?.status === value;
// profile é um conjunto de dados fictícios válido para comparar gravação, validação e leitura do perfil.
const profile = { displayName: "Nova Sato", username: "Nova", email: "nova@example.com", ensName: "nova", walletAlias: "Principal", avatar: "" };
// wallet é um cadastro fictício válido utilizado como base para testar as duas seções e a conexão.
const wallet = { displayName: "Nova", alias: "Principal", network: "Ethereum", profileName: "Nova", address: "0x1111111111111111111111111111111111111111", secondaryAddress: "", provider: "MetaMask", referralCode: "KURIO", email: "nova@example.com", ensName: "nova" };
// Ativa a interceptação MSW antes dos cenários; requisições não previstas devem falhar em vez de atingir a rede externa.
before(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(async () => {
  await client.post("/mock/reset");
  // auth contém a resposta de login usada para autorizar as operações privadas do cenário.
  const auth = (await client.post<AuthResponse>("/auth/login", { email: "nova@example.com", password: "Kurio123!" })).data;
  headers = { Authorization: `Bearer ${auth.token}` };
});
// Encerra a interceptação ao terminar a suíte, liberando os recursos do servidor de testes.
after(() => server.close());

// Cenário de regressão: perfil valida conflito, altera senha pelo hash e recupera dados confirmados.
test("perfil valida conflito, altera senha pelo hash e recupera dados confirmados", async () => {
  await client.patch("/profile", { profile }, { headers });
  await assert.rejects(client.patch("/profile", { profile: { ...profile, email: "sage@example.com" } }, { headers }), status(422));
  await assert.rejects(client.patch("/profile", { profile, password: { current: "errada", next: "NovaSenha123!" } }, { headers }), status(422));
  await client.patch("/profile", { profile: { ...profile, displayName: "Nova atualizada" }, password: { current: "Kurio123!", next: "NovaSenha123!" } }, { headers });
  assert.equal((await client.get("/profile", { headers })).data.displayName, "Nova atualizada");
  await assert.rejects(client.post("/auth/login", { email: "nova@example.com", password: "Kurio123!" }), status(401));
  assert.equal((await client.post("/auth/login", { email: "nova@example.com", password: "NovaSenha123!" })).status, 200);
});

// Cenário de regressão: carteiras validam endereço, isolam seções e simulam recusa e desconexão.
test("carteiras validam endereço, isolam seções e simulam recusa e desconexão", async () => {
  await assert.rejects(client.put("/wallets/primary", { ...wallet, address: "inválido" }, { headers }), status(422));
  await client.put("/wallets/primary", wallet, { headers });
  await client.put("/wallets/secondary", { ...wallet, alias: "Reserva" }, { headers });
  assert.equal((await client.get("/wallets", { headers })).data.primary.alias, "Principal");
  await assert.rejects(client.post("/wallets/connect", { wallet: "primary", network: "Ethereum" }, { headers: { ...headers, "x-kurio-scenario": "wallet-rejected" } }), status(409));
  await client.post("/wallets/connect", { wallet: "primary", network: "Ethereum" }, { headers });
  assert.equal((await client.get("/wallets/connect", { headers })).data.wallet, "primary");
  await client.delete("/wallets/connect", { headers });
  assert.equal((await client.get("/wallets/connect", { headers })).data, null);
});

// Cenário de regressão: favoritos persistem por conta; falhas e sessão inválida não gravam alterações.
test("favoritos persistem por conta; falhas e sessão inválida não gravam alterações", async () => {
  await client.put("/favorites/042", {}, { headers });
  await client.put("/favorites/042", {}, { headers });
  assert.deepEqual((await client.get("/favorites", { headers })).data.ids, ["042"]);
  await assert.rejects(client.delete("/favorites/042", { headers: { ...headers, "x-kurio-scenario": "mutation-error" } }), status(503));
  assert.deepEqual((await client.get("/favorites", { headers })).data.ids, ["042"]);
  // sage é a sessão da segunda conta, usada para verificar que os favoritos da primeira não são compartilhados.
  const sage = (await client.post<AuthResponse>("/auth/login", { email: "sage@example.com", password: "Kurio123!" })).data;
  assert.deepEqual((await client.get("/favorites", { headers: { Authorization: `Bearer ${sage.token}` } })).data.ids, []);
  await assert.rejects(client.get("/profile"), status(401));
  await client.delete("/favorites/042", { headers });
  assert.deepEqual((await client.get("/favorites", { headers })).data.ids, []);
});
