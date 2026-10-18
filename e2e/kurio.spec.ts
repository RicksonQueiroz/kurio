import { test, expect } from "@playwright/test";
import { fields, login, wallet, add, checkout } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  // Reset de demonstração: usa o endpoint público do mock em vez de editar bancos privados.
  await page.evaluate(async () => { await fetch("/api/mock/reset", { method: "POST" }); });
  await page.reload();
});

// Cenário de regressão: catálogo preserva URL, histórico, resultados e composição visual.
test("catálogo preserva URL, histórico, resultados e composição visual", async ({ page }) => {
  await expect(page.getByRole("link", { name: "Ver detalhes de Emerald Ape", exact: true })).toBeVisible();
  await expect(page).toHaveScreenshot("inicio.png", { animations: "disabled" });
  await page.getByRole("button", { name: "Próxima", exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await page.getByRole("textbox", { name: "Buscar NFTs por nome ou identificador" }).filter({ visible: true }).fill("Golden");
  await page.getByRole("button", { name: "Executar busca", exact: true }).filter({ visible: true }).click();
  await page.getByRole("combobox", { name: "Ordenar NFTs", exact: true }).selectOption("price-asc");
  await expect(page).toHaveURL(/sort=price-asc/);
  await expect(page).toHaveURL(/page=1/);
  await expect(page.getByRole("link", { name: "Ver detalhes de Golden Signal", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("combobox", { name: "Ordenar NFTs" })).toHaveValue("price-asc");
  if ((page.viewportSize()?.width ?? 0) >= 768) {
    await page.getByRole("button", { name: /^Assinaturas \(/ }).click();
    await page.getByRole("button", { name: /^Polygon \(/ }).click();
  } else {
    await page.getByRole("button", { name: "Abrir filtros", exact: true }).click();
    await page.getByRole("combobox", { name: "Coleção", exact: true }).selectOption("Assinaturas");
    await page.getByRole("combobox", { name: "Rede", exact: true }).selectOption("Polygon");
    await page.getByRole("button", { name: "Aplicar filtro", exact: true }).click();
  }
  await expect(page).toHaveURL(/collection=Assinaturas/);
  await expect(page).toHaveURL(/network=Polygon/);
  await expect(page.getByRole("link", { name: "Ver detalhes de Golden Signal", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Limpar filtros", exact: true }).click();
  await expect(page.getByRole("link", { name: "Ver detalhes de Emerald Ape", exact: true })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/q=Golden/);
  await expect(page.getByRole("link", { name: "Ver detalhes de Golden Signal", exact: true })).toBeVisible();
  await expect(page.locator("#catalogo")).toHaveScreenshot("catalogo.png", { animations: "disabled" });
});

// Cenário de regressão: Mercado do Header abre o catálogo pelo teclado a partir de outra rota.
test("Mercado do Header abre o catálogo pelo teclado a partir de outra rota", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "O Header é exibido a partir de 768 px.");
  await page.goto("/cart");
  // market localiza o link Mercado dentro da navegação principal para exercitar foco, Enter e seção ativa.
  const market = page.getByRole("navigation", { name: "Navegação principal", exact: true }).getByRole("link", { name: "Mercado", exact: true });
  await expect(market).toHaveAttribute("href", /\/(?:\?[^#]*)?#catalogo$/);
  await market.focus();
  await market.press("Enter");
  await expect(page).toHaveURL(/\/(?:\?[^#]*)?#catalogo$/);
  await expect(page.getByRole("region", { name: "Catálogo de NFTs", exact: true })).toBeInViewport();
  await expect(market).toHaveAttribute("aria-current", "page");
  await page.getByRole("navigation", { name: "Navegação principal", exact: true }).getByRole("link", { name: "Início", exact: true }).click();
  await expect(page).not.toHaveURL(/#catalogo/);
});

// Cenário de regressão: compra simulada confirma uma vez e recupera o recibo após refresh.
test("compra simulada confirma uma vez e recupera o recibo após refresh", async ({ page }) => {
  await login(page); await wallet(page); await add(page);
  await expect(page).toHaveScreenshot("detalhe-ou-carrinho.png", { animations: "disabled" });
  await page.goto("/cart");
  await expect(page.getByText("1.206 ETH", { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(page).toHaveScreenshot("carrinho.png", { animations: "disabled" });
  await checkout(page);
  await expect(page).toHaveScreenshot("pagamento.png", { animations: "disabled" });
  await page.getByRole("button", { name: "Confirmar compra", exact: true }).click();
  // receipt é o diálogo de compra confirmada, cuja persistência será verificada depois do refresh.
  const receipt = page.getByRole("dialog", { name: "Seus NFTs agora estão na sua carteira" });
  await expect(receipt).toBeVisible();
  // url conserva o identificador do pedido na navegação para compará-lo depois da recarga.
  const url = page.url();
  await page.reload(); await expect(receipt).toBeVisible();
  expect(page.url()).toBe(url);
  await expect(receipt).toContainText("1.206 ETH");
  await page.getByRole("button", { name: "Fechar confirmação de pedido" }).click();
  await page.goto("/cart");
  await expect(page.getByText("Seu carrinho está vazio.", { exact: true }).filter({ visible: true })).toBeVisible();
});

// Cenário de regressão: detalhe direto, inexistente, skeleton, falha e recuperação.
test("detalhe direto, inexistente, skeleton, falha e recuperação", async ({ page }) => {
  await page.goto("/nft/042?mockScenario=slow");
  await expect(page.getByRole("status", { name: "Carregando detalhes do NFT" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Emerald Ape #042", exact: true })).toBeVisible();
  await expect(page).toHaveScreenshot("detalhe.png", { animations: "disabled" });
  await page.goto("/nft/inexistente");
  await expect(page.getByText("NFT não encontrado.", { exact: true })).toBeVisible();
  await page.goto("/?mockScenario=error");
  await expect(page.getByRole("button", { name: "Tentar novamente", exact: true })).toBeVisible();
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Ver detalhes de Emerald Ape", exact: true })).toBeVisible();
});

// Cenário de regressão: cadastro, validação e foco do diálogo pelo teclado.
test("cadastro, validação e foco do diálogo pelo teclado", async ({ page }) => {
  await page.goto("/wallets");
  // dialog identifica a camada de autenticação onde cadastro, validação e Escape são exercitados.
  const dialog = page.getByRole("dialog");
  await dialog.locator('button[type="submit"]').click();
  await expect(dialog.getByRole("textbox", { name: "E-mail", exact: true })).toBeFocused();
  await dialog.getByRole("button", { name: /^(Criar conta|Novo na Kurio\? Crie uma conta)$/ }).click();
  await fields(page, { "Nome de usuário": "Teste", "E-mail": "teste@example.com", "Senha": "Teste123!", "Confirmar senha": "Teste123!" });
  await dialog.locator('button[type="submit"]').click();
  await expect(page.getByRole("heading", { name: "Carteira principal", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await expect(dialog).toBeVisible();
  await dialog.press("Escape");
  await expect(page).toHaveURL(/\/$|\/\?page=1$/);
});

// Cenário de regressão: favoritos tratam falha e isolam logout e troca de conta.
test("favoritos tratam falha e isolam logout e troca de conta", async ({ page }) => {
  await login(page); await page.goto("/nft/042");
  // favorite localiza a ação de inclusão de favorito para a obra autenticada.
  const favorite = page.getByRole("button", { name: /^(Favoritar|Adicionar aos favoritos)$/ });
  await expect(favorite).toBeEnabled(); await favorite.click();
  await expect(page.getByRole("button", { name: /^(Favoritado|Remover dos favoritos)$/ })).toBeVisible();
  await page.goto("/nft/042?mockScenario=mutation-error");
  // remove localiza a ação de remoção que receberá uma falha de mutation, sem apagar o favorito confirmado.
  const remove = page.getByRole("button", { name: /^(Favoritado|Remover dos favoritos)$/ });
  await expect(remove).toBeEnabled(); await remove.click();
  await expect(page.getByRole("alert")).toContainText("Não foi possível atualizar sua conta.");
  await page.goto("/favorites");
  await expect(page.getByRole("link", { name: "Ver detalhes de Emerald Ape", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await login(page, "sage@example.com"); await page.goto("/favorites");
  await expect(page.getByText("Você ainda não favoritou NFTs.", { exact: false })).toBeVisible();
});

// Cenário de regressão: carrinho aplica cupom, altera quantidade e preserva visitante no login.
test("carrinho aplica cupom, altera quantidade e preserva visitante no login", async ({ page }) => {
  await add(page); await page.goto("/cart");
  await page.getByRole("button", { name: "Aumentar quantidade de Emerald Ape", exact: true }).click();
  await expect(page.getByText("2.396 ETH", { exact: true }).filter({ visible: true })).toBeVisible();
  await page.getByRole("textbox", { name: "Código promocional", exact: true }).fill("KURIO10");
  await page.getByRole("button", { name: "Aplicar", exact: true }).click();
  await expect(page.getByText("2.158 ETH", { exact: true }).filter({ visible: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Remover cupom KURIO10", exact: true })).toBeVisible();
  await login(page); await page.goto("/cart");
  await expect(page.getByText("2.158 ETH", { exact: true }).filter({ visible: true })).toBeVisible();
  await page.getByRole("button", { name: "Remover Emerald Ape, edição 1/50", exact: true }).click();
  await expect(page.getByText("Seu carrinho está vazio.", { exact: true }).filter({ visible: true })).toBeVisible();
});

// Cenário de regressão: perfil valida senha atual, avatar e persistência da nova credencial.
test("perfil valida senha atual, avatar e persistência da nova credencial", async ({ page }) => {
  await login(page); await page.goto("/profile");
  await fields(page, { "Nome de exibição": "Nova atualizada", "Nome de usuário": "Nova", "E-mail": "nova@example.com", "Nome ENS": "nova", "Apelido da carteira": "Principal", "Senha atual": "errada", "Nova senha": "NovaSenha123!", "Confirmar nova senha": "NovaSenha123!" });
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Senha atual", exact: true })).toHaveAttribute("aria-invalid", "true");
  await page.getByRole("textbox", { name: "Senha atual", exact: true }).fill("Kurio123!");
  await page.locator('input[type="file"]').setInputFiles("public/images/nfts/emerald-ape.webp");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByText("Perfil e senha atualizados na simulação.", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Nome de exibição", exact: true })).toHaveValue("Nova atualizada");
  await expect(page.getByRole("img", { name: "Avatar do colecionador", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await login(page, "nova@example.com", "NovaSenha123!");
});

// Cenário de regressão: pedido pendente retoma após desconexão e sessão expirada preserva o destino.
test("pedido pendente retoma após desconexão e sessão expirada preserva o destino", async ({ page }) => {
  await login(page); await wallet(page); await add(page);
  // now fixa a referência temporal usada para simular o fim do processamento sem esperar um minuto real.
  const now = Date.now(); await page.clock.setFixedTime(now);
  await checkout(page, "order-pending");
  await page.getByRole("button", { name: "Confirmar compra", exact: true }).click();
  await expect(page).toHaveURL(/order=/);
  await page.evaluate(async () => { await fetch("/api/mock/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scenario: "disconnect" }) }); });
  await page.clock.setFixedTime(now + 62_000);
  await page.reload();
  await expect(page.getByRole("dialog", { name: "Seus NFTs agora estão na sua carteira" })).toBeVisible();
  await page.goto("/wallets?mockScenario=session-expired");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page).toHaveURL(/wallets/);
});

// Cenário de regressão: resposta perdida recupera a tentativa depois de recarregar.
test("resposta perdida recupera a tentativa depois de recarregar", async ({ page }) => {
  await login(page); await wallet(page); await add(page); await checkout(page, "order-timeout");
  await page.getByRole("button", { name: "Confirmar compra", exact: true }).click();
  await expect(page.getByRole("button", { name: "Recuperar tentativa", exact: true })).toBeEnabled();
  await page.reload();
  await page.getByRole("button", { name: "Recuperar tentativa", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Seus NFTs agora estão na sua carteira" })).toBeVisible();
});

// Cenário de regressão: evento Socket.IO atualiza preço e ignora a versão antiga.
test("evento Socket.IO atualiza preço e ignora a versão antiga", async ({ page }) => {
  await add(page); await page.goto("/cart");
  await expect(page.getByText("1.206 ETH", { exact: true }).filter({ visible: true })).toBeVisible();
  await page.evaluate(async () => { await fetch("/api/mock/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scenario: "out-of-order" }) }); });
  await expect(page.getByText("1.266 ETH", { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(page.getByText("0.026 ETH", { exact: true })).toHaveCount(0);
});

// Cenário de regressão: recusa é terminal e esgotamento ao vivo bloqueia nova compra.
test("recusa é terminal e esgotamento ao vivo bloqueia nova compra", async ({ page }) => {
  await login(page); await wallet(page); await add(page); await checkout(page, "order-declined");
  await page.getByRole("button", { name: "Confirmar compra", exact: true }).dblclick();
  await expect(page.getByRole("button", { name: "Revisar e tentar novamente", exact: true })).toBeVisible();
  // url conserva a referência do pedido recusado para verificar que a recarga não cria outra tentativa.
  const url = page.url();
  await page.reload();
  await expect(page.getByRole("button", { name: "Revisar e tentar novamente", exact: true })).toBeVisible();
  expect(page.url()).toBe(url);
  await page.goto("/payment");
  await expect(page.getByRole("button", { name: "Confirmar compra", exact: true })).toBeVisible();
  await page.evaluate(async () => { await fetch("/api/mock/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scenario: "stock-exhausted" }) }); });
  await expect(page.getByRole("button", { name: "Confirmar compra", exact: true })).toBeDisabled();
});

// Cenário de regressão: carteiras associam erro remoto ao campo e persistem edição das duas seções.
test("carteiras associam erro remoto ao campo e persistem edição das duas seções", async ({ page }) => {
  await login(page); await wallet(page);
  // A região diferencia campos com os mesmos rótulos nas duas carteiras.
  const primary = page.getByRole("region", { name: "Carteira principal", exact: true });
  // primaryAddress localiza o endereço da carteira principal, ao qual o erro remoto deve se associar e devolver o foco.
  const primaryAddress = primary.getByRole("textbox", { name: "Endereço da carteira", exact: true });
  await primaryAddress.fill("0xINVALIDO");
  await primary.getByRole("button", { name: "Salvar carteira", exact: true }).click();
  await expect(primaryAddress).toHaveAttribute("aria-invalid", "true");
  await expect(primaryAddress).toBeFocused();
  await expect(primary.getByRole("alert")).toContainText("40 caracteres hexadecimais");
  await primaryAddress.fill("0x2222222222222222222222222222222222222222");
  await primary.getByRole("textbox", { name: "Apelido da carteira", exact: true }).fill("Principal editada");
  await primary.getByRole("button", { name: "Salvar carteira", exact: true }).click();
  await expect(page.getByText("Carteira principal salva na simulação e disponível no pagamento.")).toBeVisible();
  // secondary delimita a carteira secundária, evitando confundir seus campos com os da principal.
  const secondary = page.getByRole("region", { name: "Carteira secundária", exact: true });
  await secondary.getByRole("button", { name: "Adicionar", exact: true }).click();
  await secondary.getByRole("button", { name: "Salvar carteira", exact: true }).click();
  await expect(secondary.getByRole("textbox", { name: "Nome de exibição", exact: true })).toBeFocused();
  await secondary.getByRole("checkbox", { name: "Igual à carteira principal" }).check();
  await secondary.getByRole("textbox", { name: "Apelido da carteira", exact: true }).fill("Reserva");
  await secondary.getByRole("combobox", { name: "Rede", exact: true }).selectOption("Polygon");
  await secondary.getByRole("button", { name: "Salvar carteira", exact: true }).click();
  await expect(page.getByText("Carteira secundária salva na simulação e disponível no pagamento.")).toBeVisible();
  await page.reload();
  await expect(primaryAddress).toHaveValue("0x2222222222222222222222222222222222222222");
  await expect(primary.getByRole("textbox", { name: "Apelido da carteira", exact: true })).toHaveValue("Principal editada");
  await expect(secondary.getByRole("textbox", { name: "Apelido da carteira", exact: true })).toHaveValue("Reserva");
  await expect(secondary.getByRole("combobox", { name: "Rede", exact: true })).toHaveValue("Polygon");
});

// Cenário de regressão: eventos duplicados reconciliam uma vez e não repetem itens ou valores.
test("eventos duplicados reconciliam uma vez e não repetem itens ou valores", async ({ page }) => {
  await add(page); await page.goto("/cart");
  await expect(page.getByText("1.206 ETH", { exact: true }).filter({ visible: true })).toBeVisible();
  // Contabiliza as leituras REST causadas pelos três envios da mesma versão no socket.
  let cartReads = 0;
  page.on("request", request => { if (new URL(request.url()).pathname === "/api/cart" && request.method() === "GET") cartReads++; });
  // refreshed aguarda a resposta REST causada pelo socket antes de conferir a quantidade de reconciliações.
  const refreshed = page.waitForResponse(response => new URL(response.url()).pathname === "/api/cart" && response.request().method() === "GET");
  await page.evaluate(async () => { await fetch("/api/mock/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scenario: "duplicate" }) }); });
  await refreshed;
  await expect(page.getByText("1.266 ETH", { exact: true }).filter({ visible: true })).toBeVisible();
  expect(cartReads).toBe(1);
  await expect(page.getByRole("button", { name: "Remover Emerald Ape, edição 1/50", exact: true })).toHaveCount(1);
  await page.reload();
  await expect(page.getByText("1.266 ETH", { exact: true }).filter({ visible: true })).toBeVisible();
});

// Cenário de regressão: checkout anuncia preço via socket e cotação vencida exige nova confirmação.
test("checkout anuncia preço via socket e cotação vencida exige nova confirmação", async ({ page }) => {
  await login(page); await wallet(page); await add(page); await checkout(page);
  await page.evaluate(async () => { await fetch("/api/mock/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scenario: "price-changed" }) }); });
  await expect(page.getByText("1.266 ETH", { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(page.getByText(/O preço de Emerald Ape mudou/).filter({ visible: true })).toBeVisible();
  // Avança somente Date: mantém timers reais de rede e faz a API rejeitar a cotação exibida.
  const expiredAt = Date.now() + 6 * 60_000;
  await page.clock.setFixedTime(expiredAt);
  // orderPosts conta envios de pedido para demonstrar que não há repetição automática depois do conflito.
  let orderPosts = 0;
  page.on("request", request => { if (new URL(request.url()).pathname === "/api/orders" && request.method() === "POST") orderPosts++; });
  // rejected aguarda a resposta de conflito da primeira tentativa enviada com cotação vencida.
  const rejected = page.waitForResponse(response => new URL(response.url()).pathname === "/api/orders" && response.status() === 409);
  // renewed aguarda a cotação renovada pela API antes de permitir a segunda confirmação do teste.
  const renewed = page.waitForResponse(response => new URL(response.url()).pathname === "/api/cart" && response.request().method() === "GET");
  await page.getByRole("button", { name: "Confirmar compra", exact: true }).click();
  await rejected;
  await renewed;
  await expect(page.getByText("Revise os dados e valores atualizados antes de confirmar novamente.")).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Seus NFTs agora estão na sua carteira" })).toHaveCount(0);
  await expect(page).not.toHaveURL(/order=/);
  expect(orderPosts).toBe(1);
  // Só este novo gesto pode enviar a cotação renovada; a recuperação não faz retry automático.
  await expect(page.getByRole("button", { name: "Confirmar compra", exact: true })).toBeEnabled();
  // accepted aguarda a resposta bem-sucedida da nova tentativa iniciada por um segundo gesto do usuário.
  const accepted = page.waitForResponse(response => new URL(response.url()).pathname === "/api/orders" && response.ok());
  await page.getByRole("button", { name: "Confirmar compra", exact: true }).click();
  await accepted;
  // Libera a transição do pedido sem esperar o relógio da máquina nem congelá-la em pending.
  await page.clock.setFixedTime(expiredAt + 2_000);
  await expect(page.getByRole("dialog", { name: "Seus NFTs agora estão na sua carteira" })).toContainText("1.266 ETH");
  expect(orderPosts).toBe(2);
});

