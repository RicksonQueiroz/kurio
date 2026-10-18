import { before, after, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import axios from "axios";
import { setupServer } from "msw/node";
import { authHandlers } from "../src/mocks/auth-handlers.ts";
import { cartHandlers } from "../src/mocks/cart-handlers.ts";
import { orderHandlers } from "../src/mocks/order-handlers.ts";
import { accountHandlers } from "../src/mocks/account-handlers.ts";
import { catalogHandlers, updateCatalogNFT } from "../src/mocks/catalog-handlers.ts";
import type { AuthResponse, CartResponse, Order, OrderInput } from "../src/api/contracts.ts";

// Os testes percorrem HTTP e os mesmos handlers utilizados no navegador.
const server = setupServer(...authHandlers, ...cartHandlers, ...orderHandlers, ...accountHandlers, ...catalogHandlers);
// client usa Axios e uma identidade de visitante fixa para testar a preservação do carrinho ao autenticar.
const client = axios.create({ baseURL: "http://kurio.test/api", headers: { "x-kurio-guest": "order-tests-0001" } });
// line é a seleção fictícia de NFT, edição e quantidade usada para preparar as compras.
const line = { nftId: "042", edition: "1/50", quantity: 1 };
// authorization receberá o token da conta que cria e consulta os pedidos de cada cenário.
let authorization: string;
// status cria a verificação de uma resposta HTTP de falha com o código expected.
const status = (expected: number) => (error: unknown) => axios.isAxiosError(error) && error.response?.status === expected;
// Ativa a interceptação MSW antes dos cenários; requisições não previstas devem falhar em vez de atingir a rede externa.
before(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(async () => {
  await client.post("/mock/reset");
  // auth contém o login inicial cuja sessão autoriza as operações privadas do teste.
  const auth = (await client.post<AuthResponse>("/auth/login", { email: "nova@example.com", password: "Kurio123!" })).data;
  authorization = `Bearer ${auth.token}`;
});
// Encerra a interceptação ao terminar a suíte, liberando os recursos do servidor de testes.
after(() => server.close());
// headers combina autorização, chave de idempotência key e cenário de rede para cada tentativa.
function headers(key = crypto.randomUUID(), scenario = "default") {
  return { Authorization: authorization, "Idempotency-Key": key, "x-kurio-scenario": scenario };
}
// selection prepara carteira conectada e carrinho pela API e devolve uma cotação válida para criar o pedido.
async function selection(): Promise<OrderInput> {
  // config reúne os cabeçalhos da sessão usados ao preparar os recursos do checkout.
  const config = { headers: headers() };
  await client.put("/wallets/primary", { displayName: "Nova", alias: "Principal", network: "Ethereum", profileName: "Nova", address: "0x1111111111111111111111111111111111111111", secondaryAddress: "", provider: "MetaMask", referralCode: "KURIO", email: "nova@example.com", ensName: "nova" }, config);
  await client.post("/wallets/connect", { wallet: "primary", network: "Ethereum" }, config);
  // cart contém os itens e a cotação confirmados pela API após adicionar a seleção.
  const cart = (await client.post<CartResponse>("/cart/items", line, config)).data;
  return { quoteId: cart.quote.id, quoteExpiresAt: cart.quote.expiresAt, provider: "MetaMask", network: "Ethereum", wallet: "primary" };
}
// Aguarda a transição real do mock; não altera o estado interno para fabricar um resultado.
async function settled(id: string): Promise<Order> {
  await new Promise(resolve => setTimeout(resolve, 1850));
  return (await client.get<Order>(`/orders/${id}`, { headers: headers() })).data;
}

// Cenário de regressão: cliques concorrentes e reenvio recuperam um único pedido; conteúdo diferente conflita.
test("cliques concorrentes e reenvio recuperam um único pedido; conteúdo diferente conflita", async () => {
  // input conserva o corpo de uma compra válida para testar cliques concorrentes e conflito de conteúdo.
  const input = await selection();
  // config reutiliza os mesmos cabeçalhos e a mesma chave nas duas requisições concorrentes.
  const config = { headers: headers() };
  // results contém as duas respostas concorrentes, que precisam apontar ao mesmo pedido.
  const results = await Promise.all([client.post<Order>("/orders", input, config), client.post<Order>("/orders", input, config)]);
  assert.equal(results[0].data.id, results[1].data.id);
  assert.equal(results[0].data.status, "pending");
  await assert.rejects(client.post("/orders", { ...input, provider: "WalletConnect" }, config), status(409));
  // order contém o resultado terminal consultado depois do processamento da tentativa.
  const order = await settled(results[0].data.id);
  assert.equal(order.status, "confirmed");
  assert.equal(order.total, "1.206");
  assert.equal((await client.get<CartResponse>("/cart", { headers: headers() })).data.items.length, 0);
  assert.equal((await client.post<Order>("/orders", input, config)).data.id, order.id);
});

// Cenário de regressão: resposta perdida preserva tentativa e snapshot; baixa somente a quantidade comprada.
test("resposta perdida preserva tentativa e snapshot; baixa somente a quantidade comprada", async () => {
  // input é o corpo original que precisa permanecer idêntico depois de a primeira resposta se perder.
  const input = await selection();
  // key identifica a tentativa criada antes do timeout e é reutilizada na recuperação.
  const key = crypto.randomUUID();
  await assert.rejects(client.post("/orders", input, { headers: headers(key, "order-timeout") }));
  // recovered é o pedido devolvido ao reenviar a chave e o corpo da tentativa cuja resposta se perdeu.
  const recovered = (await client.post<Order>("/orders", input, { headers: headers(key) })).data;
  // O item extra foi incluído depois da compra; não pode desaparecer com a confirmação.
  await client.post("/cart/items", line, { headers: headers() });
  // order é o resultado confirmado da tentativa recuperada, usado para conferir o snapshot e a baixa de quantidades.
  const order = await settled(recovered.id);
  assert.equal(order.status, "confirmed");
  assert.equal((await client.get<CartResponse>("/cart", { headers: headers() })).data.items[0].quantity, 1);
  updateCatalogNFT("042", { price: "2" });
  // receipt é a leitura posterior do pedido, comparada ao snapshot para garantir que o catálogo não alterou o recibo.
  const receipt = (await client.get<Order>(`/orders/${order.id}`, { headers: headers() })).data;
  assert.equal(receipt.total, "1.206");
  assert.equal(receipt.items[0].nft.price, "1.19");
});

// Cenário de regressão: recusa preserva carrinho e outro usuário não acessa o recibo.
test("recusa preserva carrinho e outro usuário não acessa o recibo", async () => {
  // input prepara uma compra válida antes de selecionar o cenário de pagamento recusado.
  const input = await selection();
  // pending é a resposta inicial do pedido que posteriormente precisa atingir o estado terminal recusado.
  const pending = (await client.post<Order>("/orders", input, { headers: headers(undefined, "order-declined") })).data;
  assert.equal((await settled(pending.id)).status, "declined");
  assert.equal((await client.get<CartResponse>("/cart", { headers: headers() })).data.items[0].quantity, 1);
  // sage autentica uma segunda conta para testar a impossibilidade de consultar o recibo de outro usuário.
  const sage = (await client.post<AuthResponse>("/auth/login", { email: "sage@example.com", password: "Kurio123!" })).data;
  await assert.rejects(client.get(`/orders/${pending.id}`, { headers: { Authorization: `Bearer ${sage.token}` } }), status(404));
  await assert.rejects(client.get(`/orders/${pending.id}`), status(401));
});

// Cenário de regressão: cotação alterada, vencida e estoque insuficiente exigem revisão sem criar compra.
test("cotação alterada, vencida e estoque insuficiente exigem revisão sem criar compra", async () => {
  // input conserva a cotação originalmente aceita para provocar conflitos de preço, vencimento e disponibilidade.
  const input = await selection();
  await assert.rejects(client.post("/orders", { ...input, quoteExpiresAt: 1 }, { headers: headers() }), status(409));
  updateCatalogNFT("042", { price: "1.25" });
  await assert.rejects(client.post("/orders", input, { headers: headers() }), status(409));
  updateCatalogNFT("042", { edition: "1/50", available: 0 });
  await assert.rejects(client.post("/orders", input, { headers: headers() }), status(409));
  assert.equal((await client.get<CartResponse>("/cart", { headers: headers() })).data.items.length, 1);
});

// Cenário de regressão: estoque consumido durante processamento recusa o pedido sem apagar itens.
test("estoque consumido durante processamento recusa o pedido sem apagar itens", async () => {
  // input prepara o pedido antes de o estoque mudar durante o processamento.
  const input = await selection();
  // pending identifica o pedido criado antes da alteração de estoque que deve causar sua recusa.
  const pending = (await client.post<Order>("/orders", input, { headers: headers() })).data;
  updateCatalogNFT("042", { edition: "1/50", available: 0 });
  assert.equal((await settled(pending.id)).status, "declined");
  assert.equal((await client.get<CartResponse>("/cart", { headers: headers() })).data.items.length, 1);
});
