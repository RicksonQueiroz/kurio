import { test, expect, chromium, type Page } from "@playwright/test";
import { resolve } from "node:path";
import { writeFile } from "node:fs/promises";
import { login, wallet, add, checkout } from "./helpers";

/** Mede o documento renderizado; não aplica CSS para esconder eventuais vazamentos. */
async function expectReflow(page: Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
}

// Cenário de regressão: movimento reduzido desativa shimmer e mantém os fluxos nas três larguras.
test("movimento reduzido desativa shimmer e mantém os fluxos nas três larguras", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/nft/042?mockScenario=slow");
  await expect(page.getByRole("status", { name: "Carregando detalhes do NFT" })).toBeVisible();
  // animations contém os nomes computados das animações dos skeletons, que devem estar desativadas com movimento reduzido.
  const animations = await page.locator(".catalog-skeleton").evaluateAll(nodes => nodes.map(node => getComputedStyle(node).animationName));
  expect(animations.length).toBeGreaterThan(0);
  expect(animations.every(name => name === "none")).toBe(true);
  await expect(page.getByRole("heading", { name: "Emerald Ape #042", exact: true })).toBeVisible();
  await page.evaluate(async () => { await fetch("/api/mock/reset", { method: "POST" }); });
  await login(page); await wallet(page); await add(page);
  // route identifica cada tela cujo documento renderizado precisa caber na largura lógica disponível.
  for (const route of ["/", "/nft/042", "/cart", "/profile", "/wallets", "/favorites"]) {
    await page.goto(route);
    await expect(page.getByRole("heading").filter({ visible: true }).first()).toBeVisible();
    await expectReflow(page);
  }
  await checkout(page); await expectReflow(page);
  await testInfo.attach("pagamento-com-movimento-reduzido", { body: await page.screenshot(), contentType: "image/png" });
});

// Cenário de regressão: zoom real de 200% preserva conteúdo, formulários e confirmação.
test("zoom real de 200% preserva conteúdo, formulários e confirmação", async ({ baseURL }, testInfo) => {
  // Zoom é um recurso do navegador desktop, executado uma vez em perfil descartável.
  test.skip(testInfo.project.name !== "desktop", "Zoom de desktop; reflow mobile/tablet é verificado no outro teste.");
  test.setTimeout(90_000);
  // extension é o diretório local da extensão de teste, carregada apenas no perfil descartável.
  const extension = resolve("e2e/zoom-extension");
  // launchZoomBrowser inicia o canal solicitado em perfil temporário, com viewport nativa para testar o zoom real.
  const launchZoomBrowser = (channel: string) => chromium.launchPersistentContext("", {
    channel, headless: true, viewport: null, baseURL,
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`, "--window-size=1440,1000"],
  });
  // Alguns Windows não iniciam o Chromium completo por erro SideBySide.
  // Somente a inicialização pode usar Edge como alternativa; falhas do teste continuam falhando.
  const requestedChannel = process.env.KURIO_ZOOM_CHANNEL;
  // context é o navegador isolado do teste; a alternativa no Windows só é usada quando o Chromium não inicia.
  const context = await launchZoomBrowser(requestedChannel ?? "chromium").catch(async error => {
    if (requestedChannel || process.platform !== "win32") throw error;
    testInfo.annotations.push({ type: "browser", description: "Zoom executado no Edge em perfil temporário: Chromium completo não iniciou no Windows." });
    return launchZoomBrowser("msedge");
  });
  try {
    // worker é o Service Worker da extensão, utilizado para chamar a API nativa de zoom sem alterar CSS da aplicação.
    const worker = context.serviceWorkers().find(item => item.url().startsWith("chrome-extension://"))
      ?? await context.waitForEvent("serviceworker");
    // page é a aba isolada em que navegação, formulários e recibo serão avaliados com zoom.
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.evaluate(async () => { await fetch("/api/mock/reset", { method: "POST" }); });
    // originalWidth registra a largura CSS antes do zoom para confirmar depois que o espaço lógico foi reduzido à metade.
    const originalWidth = await page.evaluate(() => innerWidth);
    // A API nativa muda o zoom, sem document.style.zoom nem emulação de pinch.
    const factor = await worker.evaluate(async () => {
      // api descreve apenas os métodos nativos de abas necessários para consultar e definir o zoom no perfil de teste.
      const api = (globalThis as unknown as { chrome: { tabs: {
        query: (options: { active: boolean; currentWindow: boolean }) => Promise<{ id: number }[]>;
        setZoom: (id: number, factor: number) => Promise<void>;
        getZoom: (id: number) => Promise<number>;
      } } }).chrome;
      // tab identifica a aba ativa da janela temporária, à qual o zoom de duzentos por cento será aplicado.
      const [tab] = await api.tabs.query({ active: true, currentWindow: true });
      await api.tabs.setZoom(tab.id, 2);
      return api.tabs.getZoom(tab.id);
    });
    expect(factor).toBe(2);
    await expect.poll(() => page.evaluate(() => innerWidth)).toBeLessThanOrEqual(originalWidth / 2 + 1);
    await login(page); await wallet(page); await add(page);
    // route identifica cada tela cujo documento renderizado precisa caber na largura lógica disponível.
    for (const route of ["/", "/nft/042", "/cart", "/profile", "/wallets", "/favorites"]) {
      await page.goto(route);
      await expect(page.getByRole("heading").filter({ visible: true }).first()).toBeVisible();
      await expectReflow(page);
    }
    await checkout(page); await expectReflow(page);
    await page.getByRole("button", { name: "Confirmar compra", exact: true }).click();
    // receipt localiza o diálogo confirmado para conferir visibilidade, limites e ausência de overflow interno.
    const receipt = page.getByRole("dialog", { name: "Seus NFTs agora estão na sua carteira" });
    await expect(receipt).toBeVisible();
    await expect(receipt).toBeInViewport({ ratio: 1 });
    expect(await receipt.evaluate(node => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1);
    await expectReflow(page);
    // Sem clip em pixels CSS: o zoom nativo altera DPR e a captura padrão recorta a superfície.
    const cdp = await context.newCDPSession(page);
    // screenshot contém a captura da superfície completa do navegador, evitando recorte causado pela conversão de pixels no zoom.
    const screenshot = await cdp.send("Page.captureScreenshot", { captureBeyondViewport: false, fromSurface: true });
    // screenshotPath define o arquivo da evidência de zoom dentro dos resultados deste teste.
    const screenshotPath = testInfo.outputPath("recibo-zoom-200.png");
    await writeFile(screenshotPath, Buffer.from(screenshot.data, "base64"));
    await testInfo.attach("recibo-zoom-200", { path: screenshotPath, contentType: "image/png" });
    await testInfo.attach("zoom-verificado", { body: JSON.stringify({ factor, originalWidth, ...await page.evaluate(() => ({ width: innerWidth, devicePixelRatio })) }), contentType: "application/json" });
    await page.getByRole("button", { name: "Fechar confirmação de pedido" }).press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  } finally { await context.close(); }
});
