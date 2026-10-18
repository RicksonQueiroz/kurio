// Apresenta o destaque visual da coluna lateral do catálogo.
export function FeaturedNFTBanner() {
  return (
    <section
      aria-label="NFT em destaque"
      className="relative hidden h-[470px] w-[310px] overflow-hidden bg-[linear-gradient(180deg,rgba(210,138,76,0.10),rgba(210,138,76,0.03))] pt-6 pb-1 md:block"
    >
      {/* Títulos do banner, centralizados horizontalmente. */}
      <div className="flex flex-col items-center gap-[10px]">
        <h2 className="text-[18px] font-bold text-[#E89B55]">
          NFT EM DESTAQUE
        </h2>

        <p className="text-[18px] font-bold text-[#F5F1EB]">OFERTA LIMITADA</p>
      </div>

      {/* Arte original reutilizada do catálogo.
          A largura acompanha a do banner. */}
      <img
        src="/images/nfts/sage-nomad.webp"
        alt="NFT Sage Nomad em destaque"
        className="mt-[10px] w-full rounded-[15px] object-cover"
      />
    </section>
  );
}
