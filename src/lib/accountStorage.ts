/** Dados editáveis do perfil. Senhas nunca fazem parte do armazenamento local. */
export type CollectorProfile = {
  displayName: string;
  username: string;
  email: string;
  ensName: string;
  walletAlias: string;
  avatar: string;
};

// emptyProfile define os valores iniciais dos campos do perfil, sem incluir credenciais.
export const emptyProfile: CollectorProfile = {
  displayName: "", username: "", email: "", ensName: "", walletAlias: "", avatar: "",
};

/** Recupera apenas campos conhecidos; JSON inválido ou armazenamento bloqueado inicia vazio. */
export function readProfile(userId: string): CollectorProfile {
  try {
    // saved representa os dados recuperados do armazenamento, que precisam de validação antes do uso.
    const saved: unknown = JSON.parse(localStorage.getItem(`kurio-profile:${userId}`) ?? "null");
    if (!saved || typeof saved !== "object") return { ...emptyProfile };
    // result recebe somente os campos conhecidos e válidos que serão devolvidos ao formulário.
    const result = { ...emptyProfile };
    // key percorre os campos conhecidos, copiando apenas valores válidos para a estrutura restaurada.
    for (const key of Object.keys(result) as (keyof CollectorProfile)[]) {
      // value é o conteúdo do campo em validação antes de copiá-lo para o resultado.
      const value = (saved as Record<string, unknown>)[key];
      if (typeof value === "string") result[key] = value;
    }
    // Somente imagens raster locais podem ser restauradas como avatar.
    if (!/^data:image\/(png|jpeg|webp);base64,/.test(result.avatar)) result.avatar = "";
    return result;
  } catch {
    return { ...emptyProfile };
  }
}

/** Salva apenas o perfil informado; erros de quota são tratados pela tela que chamou. */
export function saveProfile(profile: CollectorProfile, userId: string) {
  localStorage.setItem(`kurio-profile:${userId}`, JSON.stringify(profile));
}

/** Carteiras de demonstração, sem chaves privadas, seed phrases ou conexão à blockchain. */
export type CollectorWallet = {
  displayName: string;
  alias: string;
  network: string;
  profileName: string;
  address: string;
  secondaryAddress: string;
  provider: string;
  referralCode: string;
  email: string;
  ensName: string;
};
// emptyWallet define os valores iniciais de uma carteira de demonstração, sem chaves privadas.
export const emptyWallet: CollectorWallet = {
  displayName: "", alias: "", network: "", profileName: "", address: "",
  secondaryAddress: "", provider: "", referralCode: "", email: "", ensName: "",
};
// WalletSettings mantém a carteira principal e permite ausência de uma carteira secundária.
export type WalletSettings = { primary: CollectorWallet; secondary: CollectorWallet | null };

/** Converte dados persistidos em um formulário com campos de texto conhecidos. */
function parseWallet(value: unknown): CollectorWallet {
  // result recebe somente os campos conhecidos e válidos que serão devolvidos ao formulário.
  const result = { ...emptyWallet };
  if (!value || typeof value !== "object") return result;
  // key percorre os campos conhecidos, copiando apenas valores válidos para a estrutura restaurada.
  for (const key of Object.keys(result) as (keyof CollectorWallet)[]) {
    // field é o valor do campo atual, aceito somente quando seu tipo corresponde ao esperado.
    const field = (value as Record<string, unknown>)[key];
    if (typeof field === "string") result[key] = field;
  }
  return result;
}

// readWallets recebe userId e restaura as carteiras antigas dessa conta durante a migração do mock.
export function readWallets(userId: string): WalletSettings {
  try {
    // saved representa os dados recuperados do armazenamento, que precisam de validação antes do uso.
    const saved: unknown = JSON.parse(localStorage.getItem(`kurio-wallets:${userId}`) ?? "null");
    if (!saved || typeof saved !== "object") return { primary: { ...emptyWallet }, secondary: null };
    // settings agrupa as configurações das carteiras principal e secundária.
    const settings = saved as Record<string, unknown>;
    return { primary: parseWallet(settings.primary), secondary: settings.secondary ? parseWallet(settings.secondary) : null };
  } catch {
    return { primary: { ...emptyWallet }, secondary: null };
  }
}

// saveWallets persiste settings sob a chave da conta userId, preservando o isolamento entre colecionadores.
export function saveWallets(settings: WalletSettings, userId: string) {
  localStorage.setItem(`kurio-wallets:${userId}`, JSON.stringify(settings));
}
