import { before, after, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import axios from "axios";
import { setupServer } from "msw/node";
import { authHandlers } from "../src/mocks/auth-handlers.ts";
import { catalogHandlers } from "../src/mocks/catalog-handlers.ts";
import type { AuthResponse } from "../src/api/contracts.ts";

// O contrato é exercitado pelo Axios, sem chamar regras internas ou setters da interface.
const server = setupServer(...authHandlers, ...catalogHandlers);
// client é o Axios de teste que envia HTTP aos handlers MSW; não acessa o cache da interface.
const client = axios.create({ baseURL: "http://kurio.test/api" });
// credentials credenciais fictícias da conta Nova, reutilizadas nos cenários de login.
const credentials = { email: "nova@example.com", password: "Kurio123!" };
// status gera o verificador do status HTTP esperado em uma rejeição do Axios.
const status = (expected: number) => (error: unknown) => axios.isAxiosError(error) && error.response?.status === expected;
// Ativa a interceptação MSW antes dos cenários; requisições não previstas devem falhar em vez de atingir a rede externa.
before(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(async () => { await client.post("/mock/reset"); });
// Encerra a interceptação ao terminar a suíte, liberando os recursos do servidor de testes.
after(() => server.close());

// Cenário de regressão: login recupera sessão pública e logout invalida o token.
test("login recupera sessão pública e logout invalida o token", async () => {
  // data contém o corpo tipado da resposta HTTP observado neste teste.
  const { data } = await client.post<AuthResponse>("/auth/login", credentials);
  // headers transporta o token retornado pelo login para consultar ou encerrar a mesma sessão.
  const headers = { Authorization: `Bearer ${data.token}` };
  assert.equal(data.user.email, credentials.email);
  assert.equal("password" in data.user, false);
  assert.equal("passwordHash" in data.user, false);
  assert.ok(data.expiresAt > Date.now());
  assert.equal((await client.get("/auth/session", { headers })).data.user.id, data.user.id);
  await client.post("/auth/logout", {}, { headers });
  await assert.rejects(client.get("/auth/session", { headers }), status(401));
});

// Cenário de regressão: cadastro normaliza e-mail, valida campos e trata conflito.
test("cadastro normaliza e-mail, valida campos e trata conflito", async () => {
  await assert.rejects(client.post("/auth/register", { username: "A", email: "invalido", password: "123" }), status(422));
  // input contém os dados recebidos pela requisição; seus campos são validados antes da gravação.
  const input = { username: "Colecionador", email: " NOVO@example.com ", password: "SenhaTeste123!" };
  // data contém o corpo tipado da resposta HTTP observado neste teste.
  const { data } = await client.post<AuthResponse>("/auth/register", input);
  assert.equal(data.user.email, "novo@example.com");
  await assert.rejects(client.post("/auth/register", input), status(409));
  assert.equal((await client.post<AuthResponse>("/auth/login", input)).data.user.id, data.user.id);
});

// Cenário de regressão: senha incorreta, ausência de sessão e expiração retornam 401.
test("senha incorreta, ausência de sessão e expiração retornam 401", async () => {
  await assert.rejects(client.post("/auth/login", { ...credentials, password: "incorreta" }), status(401));
  await assert.rejects(client.get("/auth/session"), status(401));
  // data contém o corpo tipado da resposta HTTP observado neste teste.
  const { data } = await client.post<AuthResponse>("/auth/login", credentials);
  // headers transporta o token retornado pelo login para consultar ou encerrar a mesma sessão.
  const headers = { Authorization: `Bearer ${data.token}` };
  await client.post("/auth/expire", {}, { headers });
  await assert.rejects(client.get("/auth/session", { headers }), status(401));
});

// Cenário de regressão: sessões de duas contas são independentes; falha transitória não autentica.
test("sessões de duas contas são independentes; falha transitória não autentica", async () => {
  await assert.rejects(client.post("/auth/login", credentials, { headers: { "x-kurio-scenario": "error" } }), status(503));
  // first é a sessão de Nova, usada para verificar o isolamento em relação à conta Sage.
  const first = (await client.post<AuthResponse>("/auth/login", credentials)).data;
  // second é a sessão da conta Sage, que deve continuar válida após encerrar a de Nova.
  const second = (await client.post<AuthResponse>("/auth/login", { email: "sage@example.com", password: "Kurio123!" })).data;
  assert.notEqual(first.user.id, second.user.id);
  await client.post("/auth/logout", {}, { headers: { Authorization: `Bearer ${first.token}` } });
  assert.equal((await client.get("/auth/session", { headers: { Authorization: `Bearer ${second.token}` } })).data.user.id, second.user.id);
});
