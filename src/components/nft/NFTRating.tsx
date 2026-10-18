// Componente visual de avaliação do NFT.
// Os valores iniciais correspondem ao Emerald Ape no Figma.
type NFTRatingProps = {
  rating?: number;
  reviewCount?: number;
};

// Apresenta a avaliação ilustrativa com descrição acessível para leitores de tela.
export function NFTRating({ rating = 5, reviewCount = 19 }: NFTRatingProps) {
  return (
    <div
      className="flex flex-wrap items-center gap-2"
      aria-label={`Avaliação ${rating} de 5 estrelas, ${reviewCount} avaliações`}
    >
      {/* Exibe cinco estrelas, destacando as que fazem parte da nota. */}
      <div className="flex items-center gap-[2px]" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => (
          <span
            key={index}
            className={
              index < rating
                ? "text-[16px] text-[#E89B55]"
                : "text-[16px] text-[#CFB28C]"
            }
          >
            ★
          </span>
        ))}
      </div>

      <span className="text-[12px] text-[#F5F1EB]">
        {reviewCount} avaliações de colecionadores
      </span>
    </div>
  );
}
