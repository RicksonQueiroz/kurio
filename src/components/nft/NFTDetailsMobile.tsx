import { formatEth } from "@/lib/money";
import { useNavigate } from "@tanstack/react-router";

import type { CatalogNFT } from "@/api/contracts";

// Propriedades compartilhadas pelos layouts desktop e mobile.
export type NFTDetailsLayoutProps = {
  nft: CatalogNFT;
  isFavorite: boolean;
  isUpdatingFavorite: boolean;
  galleryView: number;
  onGalleryView: (view: number) => void;
  selectedEdition: string;
  quantity: number;
  available: number;
  availability: Record<string, number>;
  isAdding: boolean;

  // Função responsável por adicionar o NFT ao carrinho.
  onAddToCart: () => void;

  // Funções responsáveis pelas interações da página.
  onToggleFavorite: () => void;
  onSelectEdition: (edition: string) => void;
  onDecreaseQuantity: () => void;
  onIncreaseQuantity: () => void;
};

// Edições exibidas no Figma.
const editions = ["1/1", "1/10", "1/50", "ABERTA"];

// NFTDetailsMobile apresenta a mesma seleção, estoque e ações do desktop em uma composição para telas estreitas.
export function NFTDetailsMobile({
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

  // Recebe a função de adicionar ao carrinho.
  onAddToCart,
}: NFTDetailsLayoutProps) {
  // Permite navegar para o catálogo e para o carrinho.
  const navigate = useNavigate();

  // Formata o ID do token com quatro dígitos.
  const formattedTokenId = nft.id.padStart(4, "0");

  return (
    <section
      aria-label={`Detalhes de ${nft.name}`}
      className="mx-auto w-full max-w-[414px] overflow-hidden rounded-[40px] bg-[#140D0A]"
    >
      {/* ÁREA SUPERIOR: imagem e controles sobrepostos. */}
      <div className="relative bg-[#140D0A] px-[28px] pt-[23px]">
        {/* Botão de voltar com o ícone original do Figma. */}
        <button
          type="button"
          aria-label="Voltar ao catálogo"
          onClick={() => navigate({ to: "/" })}
          className="absolute left-[28px] top-[23px] z-10 flex h-9 w-9 items-center justify-center rounded-full bg-[#2B1A14]"
        >
          {/* Preserva as cores originais do SVG. */}
          <img
            src="/icons/arrow2.svg"
            alt=""
            className="h-4 w-4 object-contain"
          />
        </button>

        {/* Botão de favorito com o SVG exportado do Figma. */}
        <button
          type="button"
          aria-label={
            isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"
          }
          aria-pressed={isFavorite}
          disabled={isUpdatingFavorite}
          aria-busy={isUpdatingFavorite}
          onClick={onToggleFavorite}
          className="absolute right-[28px] top-[23px] z-10 flex h-9 w-9 items-center justify-center rounded-full bg-[#2B1A14]"
        >
          <img
            src="/icons/heart1.svg"
            alt=""
            className="h-4 w-4 object-contain"
          />
        </button>

        {/* A imagem começa abaixo dos botões de navegação. */}
        <div className="overflow-hidden pt-11">
          <img
            src={nft.image}
            alt={`${nft.name} número ${nft.id}`}
            className="aspect-square w-full object-cover object-top"
            style={galleryView ? { transform: "scale(1.5)", transformOrigin: ["center", "top", "center", "bottom"][galleryView] } : undefined}
          />
        </div>
      </div>

      {/* PAINEL DE INFORMAÇÕES: sobreposto à imagem. */}
      <div className="relative z-10 -mt-[32px] rounded-t-[31px] bg-[#241612] px-6 pb-6 pt-8">
        <div className="mb-4 flex gap-2" role="group" aria-label="Visualizações da obra">{["Completa", "Superior", "Central", "Inferior"].map((label, index) => <button key={label} type="button" aria-pressed={galleryView === index} onClick={() => onGalleryView(index)} className="min-h-8 rounded border border-[#8F6D4D] px-2 text-[10px] text-[#CFB28C]">{label}</button>)}</div>
        {/* Nome e avaliação na mesma linha. */}
        <div className="flex items-center justify-between gap-2">
          <h1 className="min-w-0 text-[16px] font-bold text-[#F5F1EB]">
            {nft.name} #{nft.id}
          </h1>

          {/* Avaliação com as cores definidas no Figma. */}
          {nft.id === "042" && (
            <span className="flex shrink-0 items-center gap-1 rounded-full border border-[#D28A4C] px-2 py-1 text-[11px]">
              {/* Estrela laranja. */}
              <span className="text-[#E89B55]">★</span>

              {/* Nota branca. */}
              <span className="text-[#F5F1EB]">4.8</span>

              {/* Quantidade de avaliações na cor secundária. */}
              <span className="text-[#CFB28C]">(19)</span>
            </span>
          )}
        </div>

        {/* Descrição: 14px e altura de linha de 24px. */}
        <p className="mt-3 text-[14px] leading-6 text-[#CFB28C]">
          {nft.id === "042"
            ? "Um colecionável digital 1/50 finalizado à mão da coleção Kurio Editions, verificado na Ethereum."
            : "Um colecionável digital da coleção Kurio Editions, registrado na Ethereum."}
        </p>

        {/* Seleção de edição. */}
        <div className="mt-3">
          <h2 className="mb-2 text-[14px] font-bold text-[#F5F1EB]">Edição:</h2>

          <div className="flex flex-wrap items-center gap-2">
            {editions.map((edition) => {
              // Identifica a edição atualmente selecionada.
              const isSelected = selectedEdition === edition;

              return (
                <button
                  key={edition}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onSelectEdition(edition)} disabled={availability[edition] === 0} title={availability[edition] === 0 ? "Edição esgotada" : undefined}
                  className={`rounded-full border px-2 py-1 text-[12px] ${
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

        {/* Metadados do NFT com espaçamento vertical de 12px. */}
        <div className="mt-3 flex flex-col gap-3 text-[13px] text-[#CFB28C]">
          <p>ID do token: #{formattedTokenId}</p>

          {/* Metadados específicos do Emerald Ape. */}
          {nft.id === "042" && (
            <>
              <p>Coleção: Kurio Apes</p>
              <p>Atributos: Óculos, Esmeralda, Raro</p>
            </>
          )}
        </div>
      </div>

      {/* BARRA DE COMPRA: seção inferior independente. */}
      <div className="rounded-t-[31px] bg-[#241612] px-6 pb-6 pt-5">
        {/* Quantidade à esquerda e preço à direita. */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-[#CFB28C]">Qtd:</span>

            {/* Botão para diminuir a quantidade. */}
            <button
              type="button"
              aria-label="Diminuir quantidade"
              disabled={quantity === 1}
              onClick={onDecreaseQuantity}
              className="flex h-7 w-5 items-center justify-center rounded-full bg-[#D28A4C] text-[15px] font-bold text-[#140D0A] disabled:opacity-50"
            >
              −
            </button>

            {/* Exibe a quantidade selecionada. */}
            <span className="min-w-4 text-center text-[14px] font-bold text-[#F5F1EB]">
              {quantity}
            </span>

            {/* Botão para aumentar a quantidade. */}
            <button
              type="button"
              aria-label="Aumentar quantidade"
              onClick={onIncreaseQuantity} disabled={quantity >= available}
              className="flex h-7 w-5 items-center justify-center rounded-full bg-[#D28A4C] text-[15px] font-bold text-[#140D0A]"
            >
              +
            </button>
          </div>

          {/* Preço unitário conforme o layout do Figma. */}
          <span className="text-[16px] font-bold text-[#E89B55]">
            {formatEth(nft.price, 2)} ETH
          </span>
        </div>

        {/* Botões de compra e carrinho. */}
        <div className="mt-5 flex items-center gap-[10px]">
          {/* Botão de compra.
              A ação de checkout será implementada posteriormente. */}
          <button
            type="button"
            disabled={isAdding || available < quantity} onClick={() => { onAddToCart(); void navigate({ to: "/cart" }); }} className="flex h-[60px] w-[196px] max-w-full items-center justify-center rounded-[40px] bg-gradient-to-r from-[#D28A4C] to-[#D28A4C]/80 px-4 text-[14px] font-bold text-[#140D0A]"
          >
            Comprar NFT
          </button>

          {/* Adiciona a seleção e abre o carrinho. */}
          <button
            type="button"
            aria-label="Adicionar ao carrinho" disabled={isAdding || available < quantity}
            onClick={() => {
              onAddToCart();
              void navigate({ to: "/cart" });
            }}
            className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-full bg-[#2B1A14]"
          >
            {/* Ícone original do carrinho exportado do Figma. */}
            <img
              src="/icons/shopmobile.svg"
              alt=""
              className="h-5 w-5 object-contain"
            />
          </button>
        </div>
      </div>
    </section>
  );
}

