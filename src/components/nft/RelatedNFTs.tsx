import { NFTCard } from "@/components/nft/NFTCard";
import { nfts } from "@/data/nfts";

// currentNftId identifica a obra aberta para excluí-la das sugestões de outros NFTs.
type RelatedNFTsProps = {
  currentNftId: string;
};

// RelatedNFTs consulta sugestões do catálogo sem repetir o NFT que está sendo visualizado.
export function RelatedNFTs({ currentNftId }: RelatedNFTsProps) {
  // Exclui o NFT atual para não recomendar o próprio item.
  // Exibe até cinco NFTs, como na referência desktop.
  const relatedNFTs = nfts.filter((nft) => nft.id !== currentNftId).slice(0, 5);

  return (
    <section aria-labelledby="related-nfts-title" className="mt-20">
      {/* Título e linha divisória da seção. */}
      <div className="mb-6 border-b border-[#D28A4C]/30 pb-3">
        <h2
          id="related-nfts-title"
          className="text-[18px] font-bold text-[#E89B55]"
        >
          Mais desta coleção
        </h2>
      </div>

      {/* Cinco cards no desktop e dois por linha no mobile.
          Cada card mantém sua navegação para os detalhes. */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5 md:gap-6">
        {relatedNFTs.map((relatedNft) => (
          <NFTCard key={relatedNft.id} nft={relatedNft} />
        ))}
      </div>
    </section>
  );
}
