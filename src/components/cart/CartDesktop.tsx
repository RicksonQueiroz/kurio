import { displayEth as formatEth, multiplyEth } from "@/lib/money";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";

import { useCart } from "@/contexts/cart-store";
// Compartilha a taxa com o carrinho mobile e a tela de pagamento.

import { nfts } from "@/data/nfts";
// Rodapé compartilhado do Kurio.
import { Footer } from "@/components/layout/Footer";

// NFTs utilizados na seção de recomendações.
const recommendedIds = ["118", "314", "088", "207", "160"];

// CartDesktop organiza itens, cupom e resumo usando os valores autoritativos do contexto do carrinho.
export function CartDesktop() {
  // Recupera os itens e as operações do carrinho.
  const { items, cartTotal, quote, applyCoupon, removeCoupon, isPending, error, updateQuantity, removeFromCart } = useCart();

  // Estado do campo promocional.
  const [promoCode, setPromoCode] = useState("");

  // Mensagem exibida ao tentar aplicar um cupom.
  const [promoMessage, setPromoMessage] = useState("");

  // Desconto e total são retornados pela cotação autoritativa da API.
  const discount = quote?.discount ?? "0";

  // Exibe o total calculado pela API.
  const total = quote?.total ?? "0";

  // Seleciona os NFTs recomendados existentes no catálogo.
  const recommendedNFTs = recommendedIds
    .map((id) => nfts.find((nft) => nft.id === id))
    .filter((nft) => nft !== undefined);

  // Impede informar que um cupom foi aplicado sem validação.
  function handleApplyPromo() { if (!promoCode.trim()) { setPromoMessage("Digite um código promocional."); return; } setPromoMessage(""); applyCoupon(promoCode); }

  return (
    <section aria-label="Carrinho de NFTs" className="w-full text-[#F5F1EB]">
      <h1 className="sr-only">Carrinho de NFTs</h1>
      {/* Caminho de navegação apresentado no Figma. */}
      <nav
        aria-label="Caminho de navegação"
        className="mb-8 text-[13px] text-[#F5F1EB]"
      >
        <Link to="/" className="hover:text-[#E89B55]">
          Início
        </Link>

        <span> / Mercado / Carrinho</span>
      </nav>

      {/* Conteúdo principal dividido em duas colunas. */}
      <div className="grid grid-cols-[minmax(0,1fr)_300px] items-start gap-8 max-[1023px]:grid-cols-1">
        {/* COLUNA ESQUERDA: tabela de NFTs. */}
        <div className="min-w-0">
          {/* Cabeçalho da tabela. */}
          <div className="grid grid-cols-[minmax(0,1.6fr)_90px_115px_100px_28px] items-center gap-3 border-b border-[#61452F] pb-3 text-[12px] font-bold">
            <span>NFTs</span>
            <span>Preço</span>
            <span>Edições</span>
            <span>Total</span>
            <span />
          </div>

          {/* Estado vazio. */}
          {items.length === 0 ? (
            <div className="rounded-b-[10px] bg-[#241612] px-5 py-10">
              <p className="mb-4 text-[14px] text-[#CFB28C]">
                Seu carrinho está vazio.
              </p>

              <Link
                to="/"
                className="text-[13px] font-bold text-[#E89B55] underline"
              >
                Explorar NFTs
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-2 pt-2">
              {/* Cada edição ocupa uma linha independente. */}
              {items.map(({ nft, edition, quantity, available }) => (
                <article
                  key={`${nft.id}-${edition}`}
                  className="grid grid-cols-[minmax(0,1.6fr)_90px_115px_100px_28px] items-center gap-3 rounded-[8px] bg-[#241612] p-3"
                >
                  {/* Imagem e identificação do NFT. */}
                  <div className="flex min-w-0 items-center gap-3">
                    <Link
                      to="/nft/$id"
                      params={{ id: nft.id }}
                      className="shrink-0"
                    >
                      <img
                        src={nft.image}
                        alt={`${nft.name} #${nft.id}`}
                        className="h-[60px] w-[60px] rounded-[6px] object-cover"
                      />
                    </Link>

                    <div className="min-w-0">
                      <Link
                        to="/nft/$id"
                        params={{ id: nft.id }}
                        className="block truncate text-[12px] font-bold hover:text-[#E89B55]"
                      >
                        {nft.name} #{nft.id}
                      </Link>

                      <p className="mt-1 text-[10px] text-[#CFB28C]">
                        ID do token: #{nft.id.padStart(4, "0")}
                      </p>

                      {/* Edição escolhida nos detalhes do NFT. */}
                      <p className="mt-1 text-[10px] text-[#CFB28C]">
                        Edição: {edition}
                      </p>
                    </div>
                  </div>

                  {/* Preço unitário. */}
                  <span className="text-[12px] text-[#F5F1EB]">
                    {formatEth(nft.price, 2)} ETH
                  </span>

                  {/* Controle de quantidade. */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label={`Diminuir quantidade de ${nft.name}`} disabled={isPending}
                      onClick={() =>
                        updateQuantity(nft.id, quantity - 1, edition)
                      }
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#D28A4C] text-[15px] font-bold text-[#140D0A]"
                    >
                      −
                    </button>

                    <span className="min-w-4 text-center text-[12px]">
                      {quantity}
                    </span>

                    <button
                      type="button"
                      aria-label={`Aumentar quantidade de ${nft.name}`} disabled={isPending || (available !== undefined && quantity >= available)}
                      onClick={() =>
                        updateQuantity(nft.id, quantity + 1, edition)
                      }
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#D28A4C] text-[15px] font-bold text-[#140D0A]"
                    >
                      +
                    </button>
                  </div>

                  {/* Total da linha. */}
                  <span className="text-[12px] font-bold text-[#E89B55]">
                    {formatEth(multiplyEth(nft.price, quantity), 2)} ETH
                  </span>

                  {/* Remove somente a edição correspondente. */}
                  <button
                    type="button"
                    aria-label={`Remover ${nft.name}, edição ${edition}`} disabled={isPending}
                    onClick={() => removeFromCart(nft.id, edition)}
                    className="flex h-7 w-7 items-center justify-center text-[#CFB28C] hover:text-[#E89B55]"
                  >
                    <Trash2 size={16} />
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>

        {/* COLUNA DIREITA: resumo da carteira. */}
        <aside aria-label="Resumo da carteira" className="min-w-0">
          <h2 className="border-b border-[#61452F] pb-3 text-[14px] font-bold">
            Resumo da carteira
          </h2>

          {/* Código promocional. */}
          <div className="mt-4">
            <label
              htmlFor="desktop-promo-code"
              className="mb-2 block text-[11px] font-bold text-[#F5F1EB]"
            >
              Código promocional
            </label>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                handleApplyPromo();
              }}
              className="flex h-[40px] overflow-hidden rounded-[5px] border border-[#61452F] bg-[#2B1A14]"
            >
              <input
                id="desktop-promo-code"
                type="text"
                value={promoCode}
                onChange={(event) => {
                  setPromoCode(event.target.value);
                  setPromoMessage("");
                }}
                placeholder="Digite o código promocional..."
                className="min-w-0 flex-1 bg-transparent px-2 text-[10px] text-[#F5F1EB] outline-none placeholder:text-[#A98B68]"
              />

              {/* Gradiente usado nos botões do Kurio. */}
              {/* Botão Aplicar com cor sólida, conforme o Figma desktop. */}

              {/* Botão Aplicar com fundo sólido e texto escuro. */}
              <button
                type="submit" disabled={isPending} aria-busy={isPending}
                className="shrink-0 bg-[#D28A4C] px-3 text-[11px] font-bold text-[#140D0A]"
              >
                Aplicar
              </button>
            </form>

            {quote?.coupon && <button type="button" disabled={isPending} onClick={removeCoupon} className="mt-2 text-[11px] text-[#E89B55] underline">Remover cupom {quote.coupon}</button>}
            {promoMessage && (
              <p role="status" className="mt-2 text-[10px] text-[#CFB28C]">
                {promoMessage}
              </p>
            )}
          </div>

          {/* Subtotal. */}
          <div className="mt-5 flex items-center justify-between gap-3 text-[12px]">
            <span>Subtotal</span>
            <span>{formatEth(cartTotal, 2)} ETH</span>
          </div>

          {/* Desconto validado e calculado pela API. */}
          <div className="mt-3 flex items-center justify-between gap-3 text-[12px]">
            <span>Desconto de lançamento</span>
            <span>(−) {formatEth(discount, 2)}</span>
          </div>

          {/* Taxa de rede estimada. */}
          <div className="mt-3 flex items-start justify-between gap-3 text-[12px]">
            <span>Taxa de rede</span>

            <div className="text-right">
              <p>{formatEth(quote?.networkFee ?? "0", 3)} ETH</p>
              <p className="mt-1 text-[10px] text-[#E89B55]">Taxa estimada</p>
            </div>
          </div>

          {/* Total estimado. */}
          <div className="mt-7 flex items-center justify-between gap-3 border-t border-[#61452F] pt-4">
            <span className="text-[14px] font-bold">Total</span>

            <span className="text-[14px] font-bold text-[#E89B55]">
              {formatEth(total, 3)} ETH
            </span>
          </div>

          {/* Navega para /payment preservando os itens no contexto compartilhado.
              O link fica desabilitado quando o carrinho está vazio. */}
          <Link
            to="/payment"
            disabled={items.length === 0 || isPending || !quote?.valid || !!error}
            className="mt-5 flex h-[42px] w-full items-center justify-center rounded-[5px] bg-[#D28A4C] text-[12px] font-bold text-[#140D0A] disabled:cursor-not-allowed"
          >
            Conectar e finalizar
          </Link>

          {/* Link para continuar navegando pelo catálogo. */}
          <Link
            to="/"
            className="mt-3 block text-center text-[11px] text-[#E89B55] hover:underline"
          >
            Continuar explorando
          </Link>
        </aside>
      </div>

      {/* SEÇÃO INFERIOR: recomendações do catálogo. */}
      <div className="mt-20">
        <h2 className="border-b border-[#61452F] pb-3 text-[14px] font-bold text-[#E89B55]">
          Colecionadores também viram
        </h2>

        {/* Cinco NFTs recomendados, como na referência desktop. */}
        <div className="mt-5 grid grid-cols-5 gap-4">
          {recommendedNFTs.map((nft) => (
            <Link
              key={nft.id}
              to="/nft/$id"
              params={{ id: nft.id }}
              className="group min-w-0"
            >
              <div className="overflow-hidden rounded-[8px] bg-[#241612] p-2">
                <img
                  src={nft.image}
                  alt={`${nft.name} #${nft.id}`}
                  className="aspect-square w-full rounded-[6px] object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                />
              </div>

              <h3 className="mt-2 truncate text-[12px] text-[#F5F1EB] group-hover:text-[#E89B55]">
                {nft.name} #{nft.id}
              </h3>

              <p className="mt-1 text-[12px] font-bold text-[#E89B55]">
                {formatEth(nft.price, 2)} ETH
              </p>
            </Link>
          ))}
        </div>
      </div>

      {/* Rodapé desktop abaixo das recomendações. */}
      <div className="mt-20">
        <Footer />
      </div>
    </section>
  );
}



