import { expect, type Page } from "@playwright/test";

// Credenciais e endereços são fixtures, nunca dados de uma carteira real.
export const address = "0x1111111111111111111111111111111111111111";
// fields recebe a aba e pares de rótulo/valor para preencher os controles pela mesma identificação acessível usada pelo usuário.
export async function fields(page: Page, values: Record<string, string>) {
  // name é o rótulo acessível do controle e value é o texto que o cenário pretende preencher.
  for (const [name, value] of Object.entries(values)) await page.getByRole("textbox", { name, exact: true }).fill(value);
}
// login autentica email e password fictícios pelo diálogo e aguarda a abertura da página privada.
export async function login(page: Page, email = "nova@example.com", password = "Kurio123!") {
  await page.goto("/wallets");
  // dialog localiza a apresentação desktop ou mobile de entrada, sem depender do texto do botão de modo.
  const dialog = page.getByRole("dialog", { name: /^Entrar(?: na Kurio)?$/ });
  await dialog.getByRole("textbox", { name: "E-mail", exact: true }).fill(email);
  await dialog.getByRole("textbox", { name: "Senha", exact: true }).fill(password);
  await dialog.locator('button[type="submit"]').click();
  await expect(page.getByRole("heading", { name: "Carteira principal", exact: true })).toBeVisible();
}
// wallet cadastra uma carteira fictícia válida pela interface e aguarda a confirmação da API.
export async function wallet(page: Page) {
  await fields(page, { "Nome de exibição": "Nova", "Apelido da carteira": "Principal", "Nome do perfil": "Nova", "Endereço da carteira": address, "Código de indicação": "KURIO", "E-mail": "nova@example.com", "Nome ENS": "nova" });
  await page.getByRole("combobox", { name: "Rede", exact: true }).selectOption("Ethereum");
  await page.getByRole("combobox", { name: "Tipo de carteira", exact: true }).selectOption("MetaMask");
  await page.getByRole("button", { name: "Salvar carteira", exact: true }).click();
  await expect(page.getByText("Carteira principal salva na simulação e disponível no pagamento.")).toBeVisible();
}
// add abre a obra conhecida e adiciona uma unidade ao carrinho pela ação disponível no layout atual.
export async function add(page: Page) {
  await page.goto("/nft/042");
  await page.getByRole("button", { name: /^(COMPRAR|Adicionar ao carrinho)$/ }).click();
  await expect(page.getByText("NFT adicionado ao carrinho.", { exact: true })).toBeVisible();
}
// checkout abre o cenário solicitado, conecta a carteira cadastrada e preenche os campos exigidos no desktop.
export async function checkout(page: Page, scenario = "default") {
  await page.goto(`/payment?mockScenario=${scenario}`);
  await page.getByRole("button", { name: "Conectar carteira", exact: true }).click();
  await expect(page.getByRole("button", { name: "Desconectar carteira", exact: true })).toBeVisible();
  if ((page.viewportSize()?.width ?? 0) >= 768) {
    await fields(page, { "Nome de exibição": "Nova", "Nome de usuário": "Nova", "Nome do perfil": "Nova", "Endereço da carteira": address, "Código de indicação": "KURIO", "E-mail": "nova@example.com" });
    await page.getByRole("combobox", { name: "Rede", exact: true }).selectOption("Ethereum");
    await page.getByRole("combobox", { name: "Tipo de carteira", exact: true }).selectOption("MetaMask");
  }
}


