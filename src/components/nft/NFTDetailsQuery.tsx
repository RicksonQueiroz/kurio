import { useQuery } from "@tanstack/react-query";
import { nftQueryOptions } from "@/api/catalog";
import { apiErrorMessage } from "@/api/http";
import { NFTDetails } from "@/pages/NFTDetails";
import { Button } from "@/components/ui/button";
import { NFTDetailsSkeleton } from "./NFTDetailsSkeleton";

/** Consulta o mesmo catálogo usado na Home, inclusive ao abrir uma URL diretamente. */
export function NFTDetailsQuery({ id }: { id: string }) {
  // query reúne resposta, carregamento e erro da consulta remota usada por este componente.
  const query = useQuery(nftQueryOptions(id));
  if (query.isPending) return <NFTDetailsSkeleton />;
  if (query.isError) return (
    <main className="mx-auto max-w-[1200px] px-6 py-12" role="alert">
      <h1 className="mb-4 text-xl font-bold">Detalhes do NFT</h1>
      <p>{apiErrorMessage(query.error)}</p>
      <Button className="mt-4" onClick={() => void query.refetch()}>Tentar novamente</Button>
    </main>
  );
  // A apresentação aprovada recebe somente os dados resolvidos pela API.
  return <NFTDetails nft={query.data} />;
}
