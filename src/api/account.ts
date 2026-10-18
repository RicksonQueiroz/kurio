import { queryOptions } from "@tanstack/react-query";
import { api } from "./http";
import type { CollectorProfile, CollectorWallet, WalletSettings } from "@/lib/accountStorage";
import type { CatalogNFT } from "./contracts";

/** Os identificadores de conta fazem parte das chaves de todos os recursos privados. */
export const profileQuery = (userId: string) => queryOptions({ queryKey: ["profile", userId], queryFn: async ({ signal }) => (await api.get<CollectorProfile>("/profile", { signal })).data });
// walletsQuery consulta as duas carteiras e separa o cache por userId; signal cancela leituras obsoletas.
export const walletsQuery = (userId: string) => queryOptions({ queryKey: ["wallets", userId], queryFn: async ({ signal }) => (await api.get<WalletSettings>("/wallets", { signal })).data });
// connectionQuery recupera a carteira e a rede conectadas na sessão, sem solicitar assinatura real.
export const connectionQuery = (userId: string) => queryOptions({ queryKey: ["connection", userId], queryFn: async ({ signal }) => (await api.get<{ wallet: "primary" | "secondary"; network: string } | null>("/wallets/connect", { signal })).data });
// favoritesQuery devolve os identificadores e os NFTs favoritos somente da conta informada.
export const favoritesQuery = (userId: string) => queryOptions({ queryKey: ["favorites", userId], queryFn: async ({ signal }) => (await api.get<{ ids: string[]; items: CatalogNFT[] }>("/favorites", { signal })).data });
// accountApi agrupa as escritas REST de perfil, carteiras, favoritos e conexão simulada.
export const accountApi = {
  // input transporta o perfil editado e, opcionalmente, a senha atual e a nova senha para validação remota.
  saveProfile: async (input: { profile: CollectorProfile; password?: { current: string; next: string } }) => (await api.patch<CollectorProfile>("/profile", input)).data,
  // slot escolhe principal ou secundária; wallet contém o cadastro daquela seção, sem substituir a outra.
  saveWallet: async ({ slot, wallet }: { slot: "primary" | "secondary"; wallet: CollectorWallet }) => (await api.put<WalletSettings>(`/wallets/${slot}`, wallet)).data,
  // id identifica a obra; selected decide entre incluir e remover o favorito da conta autenticada.
  favorite: async ({ id, selected }: { id: string; selected: boolean }) => (selected ? await api.put<{ ids: string[] }>(`/favorites/${id}`) : await api.delete<{ ids: string[] }>(`/favorites/${id}`)).data,
  // input apresenta a carteira cadastrada e sua rede para simular conexão ou recusa pela API.
  connect: async (input: { wallet: "primary" | "secondary"; network: string }) => (await api.post("/wallets/connect", input)).data,
  // A desconexão remove o vínculo remoto; não apaga o cadastro da carteira.
  disconnect: async () => { await api.delete("/wallets/connect"); },
};
