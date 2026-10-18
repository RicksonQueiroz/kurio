import { useQuery } from "@tanstack/react-query";
import { favoritesQuery } from "@/api/account";
import { useAuth } from "@/contexts/auth-store";
import { AccountLayout } from "@/components/account/AccountLayout";
import { AccountQueryFeedback } from "@/components/account/AccountQueryFeedback";
import { NFTCard } from "@/components/nft/NFTCard";
import { Link } from "@tanstack/react-router";

/** Consulta os favoritos da conta, mantendo a composição das telas de colecionador. */
export function Favorites() {
  // user define a conta à qual a lista de interesse pertence.
  const { user } = useAuth();
  // query recupera os favoritos e seus estados de carregamento, erro e sucesso pela API.
  const query = useQuery(favoritesQuery(user!.id));
  if (!query.data) return <AccountQueryFeedback error={query.error} retry={() => void query.refetch()} />;
  return <AccountLayout><h1 className="mb-6 text-[18px] font-bold">Lista de interesse</h1>{query.data.items.length ? <div className="grid grid-cols-2 gap-6 lg:grid-cols-3">{query.data.items.map(nft => <NFTCard key={nft.id} nft={nft} />)}</div> : <p>Você ainda não favoritou NFTs. <Link to="/" className="text-[#E89B55] underline">Explorar catálogo</Link></p>}</AccountLayout>;
}
