/** ETH trafega como texto; as operações usam unidades de 10^-18 ETH, sem ponto flutuante. */
// SCALE define quantos wei existem em 1 ETH: 10 elevado a 18, como inteiro de precisão arbitrária.
const SCALE = 10n ** 18n;
// ETH_PATTERN aceita apenas valores decimais não negativos, com até 18 casas e sem notação científica.
const ETH_PATTERN = /^(0|[1-9]\d*)(?:\.(\d{1,18}))?$/;

// Verifica se um valor desconhecido segue o contrato decimal usado em ETH.
export function isEth(value: unknown): value is string {
  return typeof value === "string" && ETH_PATTERN.test(value);
}

// Converte ETH decimal para a menor unidade inteira, sem usar ponto flutuante.
export function toWei(value: string): bigint {
  if (!isEth(value)) throw new Error("Valor em ETH inválido.");
  // whole contém a parte inteira; fraction contém os decimais, ou texto vazio quando não existem.
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * SCALE + BigInt(fraction.padEnd(18, "0"));
}

// Converte a quantidade inteira de wei para uma string decimal canônica.
export function fromWei(value: bigint): string {
  if (value < 0n) throw new Error("Valor em ETH não pode ser negativo.");
  // whole representa a parte inteira do valor em ETH.
  const whole = value / SCALE;
  // fraction representa as casas decimais, preenchidas ou limpas conforme a conversão para wei.
  const fraction = (value % SCALE).toString().padStart(18, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

// Soma valores decimais por meio de inteiros em wei.
export function addEth(...values: string[]): string {
  return fromWei(values.reduce((sum, value) => sum + toWei(value), 0n));
}

// Subtrai um desconto e rejeita resultados monetários negativos.
export function subtractEth(value: string, discount: string): string {
  return fromWei(toWei(value) - toWei(discount));
}

// Multiplica o preço por uma quantidade inteira validada.
export function multiplyEth(value: string, quantity: number): string {
  if (!Number.isSafeInteger(quantity) || quantity < 0) throw new Error("Quantidade inválida.");
  return fromWei(toWei(value) * BigInt(quantity));
}

// Compara valores exatos, retornando -1, 0 ou 1 conforme sua ordem.
export function compareEth(left: string, right: string): number {
  // a contém o primeiro valor convertido em wei para comparação exata.
  const a = toWei(left);
  // b contém o segundo valor convertido em wei para comparação exata.
  const b = toWei(right);
  return a === b ? 0 : a < b ? -1 : 1;
}

/** Exibe todos os decimais significativos da cotação, com o mínimo visual de casas do layout. */
export function displayEth(value: string, minimumDecimals = 2): string {
  // whole contém a parte inteira; fraction contém os decimais, ou texto vazio quando não existem.
  const [whole, fraction = ""] = fromWei(toWei(value)).split(".");
  // digits contém as casas decimais preparadas para montar o texto exibido.
  const digits = fraction.padEnd(minimumDecimals, "0");
  return digits ? `${whole}.${digits}` : whole;
}

/** Arredonda empates para cima apenas na apresentação; os cálculos preservam os 18 decimais. */
export function formatEth(value: string, decimals = 2): string {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) throw new Error("Precisão inválida.");
  // divisor define a unidade de arredondamento conforme o número de casas solicitado.
  const divisor = 10n ** BigInt(18 - decimals);
  // rounded é o inteiro já arredondado para apresentação, sem alterar o valor monetário original.
  const rounded = (toWei(value) + (divisor === 1n ? 0n : divisor / 2n)) / divisor;
  if (decimals === 0) return rounded.toString();
  // digits contém as casas decimais preparadas para montar o texto exibido.
  const digits = rounded.toString().padStart(decimals + 1, "0");
  return `${digits.slice(0, -decimals)}.${digits.slice(-decimals)}`;
}
