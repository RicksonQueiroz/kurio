import { formatEth } from "@/lib/money";
import { Link } from "@tanstack/react-router";

import { NFTRating } from "@/components/nft/NFTRating";
import type { NFTDetailsLayoutProps } from "@/components/nft/NFTDetailsMobile";

// Edições disponíveis na interface do Figma.
const editions = ["1/1", "1/10", "1/50", "ABERTA"];

// NFTDetailsDesktop recebe a seleção e os callbacks da página, compondo galeria e compra no layout amplo.
export function NFTDetailsDesktop({
  nft,
  isFavorite,
  isUpdatingFavorite,
  galleryView, onGalleryView,
  selectedEdition,
  quantity,
  available, availability, isAdding,
  onToggleFavorite,
  onSelectEdition,
  onDecreaseQuantity,
  onIncreaseQuantity,

  // Recebe a função responsável por adicionar o NFT ao carrinho.
  onAddToCart,
}: NFTDetailsLayoutProps) {
  // Formata o identificador do token com quatro dígitos.
  const formattedTokenId = nft.id.padStart(4, "0");

  // URL utilizada para compartilhar o NFT.
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  return (
    <>
      {/* Caminho de navegação acima dos detalhes. */}
      <nav
        aria-label="Caminho de navegação"
        className="mb-6 text-[14px] text-[#F5F1EB]"
      >
        <Link to="/" className="hover:text-[#E89B55]">
          Início
        </Link>
        <span> / Mercado</span>
      </nav>

      {/* Galeria à esquerda e informações à direita. */}
      <section className="grid grid-cols-[420px_minmax(0,1fr)] gap-8 max-[1023px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Galeria com quatro miniaturas. */}
        <div className="flex min-w-0 gap-3">
          <div className="flex w-[72px] shrink-0 flex-col gap-3 max-[1023px]:hidden">
            {[0, 1, 2, 3].map((index) => (
              <button
                key={index}
                type="button"
                aria-label={["Ver obra completa", "Ver detalhe superior", "Ver detalhe central", "Ver detalhe inferior"][index]}
                aria-pressed={galleryView === index}
                onClick={() => onGalleryView(index)}
                className={`overflow-hidden rounded-[10px] border ${
                  index === galleryView ? "border-[#E89B55]" : "border-transparent"
                }`}
              >
                <img
                  src={nft.image}
                  alt=""
                  className="aspect-square w-full object-cover"
                  style={index ? { transform: "scale(1.5)", transformOrigin: ["center", "top", "center", "bottom"][index] } : undefined}
                />
              </button>
            ))}
          </div>

          {/* Imagem principal sobre o fundo marrom. */}
          <div className="flex min-w-0 flex-1 items-center justify-center overflow-hidden rounded-[10px] bg-[#241612] p-3">
            <img
              src={nft.image}
              alt={`${nft.name} número ${nft.id}`}
              className="aspect-square w-full rounded-[16px] object-cover"
              style={galleryView ? { transform: "scale(1.5)", transformOrigin: ["center", "top", "center", "bottom"][galleryView] } : undefined}
            />
          </div>
        </div>

        {/* Informações principais do NFT. */}
        <div className="flex min-w-0 flex-col gap-4">
          {/* Título, preço e avaliação. */}
          <div className="flex flex-col gap-2">
            <h1 className="text-[24px] font-bold text-[#F5F1EB]">
              {nft.name} #{nft.id}
            </h1>

            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <p className="text-[18px] font-bold text-[#E89B55]">
                {formatEth(nft.price, 2)} ETH
              </p>

              {/* Avaliação disponível para Emerald Ape. */}
              {nft.id === "042" && <NFTRating rating={5} reviewCount={19} />}
            </div>
          </div>

          {/* Divisor entre preço e descrição. */}
          <div className="h-px w-full bg-[#61452F]" />

          {/* Resumo do NFT. */}
          <div>
            <h2 className="mb-2 text-[14px] font-bold text-[#F5F1EB]">
              Sobre este NFT:
            </h2>

            <p className="text-[14px] leading-6 text-[#CFB28C]">
              {nft.id === "042"
                ? "Um colecionável digital finalizado à mão da coleção Kurio Editions, verificado na Ethereum, com arte desbloqueável e acesso para colecionadores."
                : "Um colecionável digital da coleção Kurio Editions, registrado na blockchain Ethereum."}
            </p>
          </div>

          {/* Edições selecionáveis. */}
          <div className="flex flex-col gap-2">
            <h2 className="text-[14px] font-bold text-[#F5F1EB]">Edição:</h2>

            <div className="flex flex-wrap items-center gap-2">
              {editions.map((edition) => {
                // Identifica a edição selecionada.
                const isSelected = selectedEdition === edition;

                return (
                  <button
                    key={edition}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => onSelectEdition(edition)} disabled={availability[edition] === 0} title={availability[edition] === 0 ? "Edição esgotada" : undefined}
                    className={`rounded-full border px-3 py-1 text-[12px] ${
                      isSelected
                        ? "border-[#D28A4C] text-[#E89B55]"
                        : "border-[#61452F] text-[#CFB28C]"
                    }`}
                  >
                    {edition}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quantidade e ações de compra. */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {/* Diminuir quantidade. */}
              <button
                type="button"
                aria-label="Diminuir quantidade"
                disabled={quantity === 1}
                onClick={onDecreaseQuantity}
                className="flex h-10 w-8 items-center justify-center rounded-full bg-[#D28A4C] text-[20px] font-bold text-[#140D0A] disabled:opacity-50"
              >
                −
              </button>

              {/* Quantidade selecionada. */}
              <span className="min-w-5 text-center text-[18px] font-bold text-[#F5F1EB]">
                {quantity}
              </span>

              {/* Aumentar quantidade. */}
              <button
                type="button"
                aria-label="Aumentar quantidade"
                onClick={onIncreaseQuantity} disabled={quantity >= available}
                className="flex h-10 w-8 items-center justify-center rounded-full bg-[#D28A4C] text-[20px] font-bold text-[#140D0A]"
              >
                +
              </button>
            </div>

            {/* Ações à direita. */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Adiciona ao carrinho o NFT e a quantidade selecionada.
                  O checkout será implementado posteriormente. */}
              <button
                type="button"
                onClick={onAddToCart} disabled={isAdding || available < quantity}
                className="flex h-8 items-center justify-center rounded-[5px] bg-[#D28A4C] px-7 text-[12px] font-bold text-[#140D0A]"
              >
                COMPRAR
              </button>

              {/* Favorito com o SVG original do Figma. */}
              <button
                type="button"
                aria-pressed={isFavorite}
                disabled={isUpdatingFavorite}
                aria-busy={isUpdatingFavorite}
                onClick={onToggleFavorite}
                className="flex h-8 items-center justify-center gap-2 rounded-[5px] border border-[#D28A4C] px-3 text-[12px] text-[#E89B55]"
              >
                <img
                  src="/icons/heart1.svg"
                  alt=""
                  className="h-4 w-4 object-contain"
                />

                <span>{isFavorite ? "Favoritado" : "Favoritar"}</span>
              </button>
            </div>
          </div>

          {/* Metadados do NFT. */}
          <div className="text-[13px] leading-6 text-[#CFB28C]">
            <p>ID do token: #{formattedTokenId}</p>

            {nft.id === "042" && (
              <>
                <p>Coleção: Kurio Apes</p>
                <p>Atributos: Óculos, Esmeralda, Raro</p>
              </>
            )}
          </div>

          {/* Compartilhamento agrupado à esquerda. */}
          <div className="flex flex-wrap items-center justify-start gap-3">
            <span className="text-[13px] font-bold text-[#F5F1EB]">
              Compartilhar este NFT:
            </span>

            <div className="flex shrink-0 items-center gap-2">
              {/* LinkedIn. */}
              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Compartilhar no LinkedIn"
              >
                <img
                  src="/icons/linkedin.svg"
                  alt=""
                  className="h-4 w-4 object-contain"
                />
              </a>

              {/* E-mail. */}
              <a
                href={`mailto:?subject=${encodeURIComponent(
                  `${nft.name} #${nft.id}`,
                )}&body=${encodeURIComponent(shareUrl)}`}
                aria-label="Compartilhar por e-mail"
              >
                <img
                  src="/icons/email.svg"
                  alt=""
                  className="h-4 w-4 object-contain"
                />
              </a>

              {/* Twitter/X. */}
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                  `${nft.name} #${nft.id}`,
                )}&url=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Compartilhar no Twitter"
              >
                <img
                  src="/icons/twitter.svg"
                  alt=""
                  className="h-4 w-4 object-contain"
                />
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

