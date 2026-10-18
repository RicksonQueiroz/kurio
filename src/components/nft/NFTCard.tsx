import { formatEth } from "@/lib/money";
import { Link } from "@tanstack/react-router";
import type { NFT } from "@/data/nfts";

// Cada card recebe os dados de um NFT do catálogo.
type NFTCardProps = {
  nft: NFT;
};

// Apresenta arte, nome e preço, com link para os detalhes do NFT.
export function NFTCard({ nft }: NFTCardProps) {
  return (
    <article className="flex w-full min-w-0 flex-col gap-3 md:max-w-[258px]">
      {/* O Link torna o card inteiro clicável.
          O ID do NFT é enviado como parâmetro da rota. */}
      <Link
        to="/nft/$id"
        params={{ id: nft.id }}
        aria-label={`Ver detalhes de ${nft.name}`}
        className="flex flex-col gap-3 focus-visible:outline-2 focus-visible:outline-[#E89B55]"
      >
        {/* Fundo marrom de 258 × 300px no desktop.
            A imagem permanece centralizada. */}
        <div className="flex aspect-[258/300] w-full items-center justify-center bg-[#241612]">
          <img
            src={nft.image}
            alt={nft.name}
            loading="lazy"
            decoding="async"
            width={250}
            height={250}
            className="aspect-square w-[calc(100%-8px)] rounded-[15px] object-cover"
          />
        </div>

        {/* Nome e preço conforme o Figma. */}
        <div>
          <h3 className="text-[16px] leading-[16px] font-normal text-[#F5F1EB]">
            {nft.name} #{nft.id}
          </h3>

          <p className="mt-2 text-[18px] leading-[16px] font-bold text-[#E89B55]">
            {formatEth(nft.price, 2)} ETH
          </p>
        </div>
      </Link>
    </article>
  );
}
