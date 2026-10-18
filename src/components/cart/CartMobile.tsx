import { displayEth as formatEth, multiplyEth } from "@/lib/money";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";

import { useCart } from "@/contexts/cart-store";
// Mesma estimativa usada no desktop e no pagamento, evitando totais diferentes.


export function CartMobile() {
  // Dados e operações compartilhados do carrinho.
  const { items, cartTotal, quote, applyCoupon, removeCoupon, isPending, error, updateQuantity, removeFromCart } = useCart();

  // Armazena o código promocional digitado.
  const [promoCode, setPromoCode] = useState("");

  // Controla a mensagem exibida após tentar aplicar um cupom.
  const [promoMessage, setPromoMessage] = useState("");

  // Desconto calculado e validado pela API.
  const discount = quote?.discount ?? "0";

  // A API fornece o total, incluindo desconto e taxa.
  const total = quote?.total ?? "0";

  // Evita indicar que um cupom foi aplicado sem validação.
  function handleApplyPromo() { if (!promoCode.trim()) { setPromoMessage("Digite um código promocional."); return; } setPromoMessage(""); applyCoupon(promoCode); }

  return (
    <section
      aria-label="Carrinho de NFTs"
      className="mx-auto min-h-screen w-full max-w-[414px] rounded-t-[40px] bg-[#140D0A] px-6 pb-8 pt-7"
    >
      {/* Cabeçalho com botão de voltar e título centralizado. */}
      <div className="relative mb-6 flex h-12 items-center justify-center">
        <Link
          to="/"
          aria-label="Voltar ao catálogo"
          className="absolute left-0 flex h-9 w-9 items-center justify-center rounded-full bg-[#2B1A14]"
        >
          <img
            src="/icons/arrow2.svg"
            alt=""
            className="h-4 w-4 object-contain"
          />
        </Link>

        <h1 className="text-center text-[18px] font-bold text-[#F5F1EB]">
          Carrinho de NFTs
        </h1>
      </div>

      {/* Estado vazio do carrinho. */}
      {items.length === 0 ? (
        <div className="rounded-[14px] bg-[#241612] p-6 text-center">
          <p className="mb-4 text-[14px] text-[#CFB28C]">
            Seu carrinho está vazio.
          </p>

          <Link
            to="/"
            className="text-[14px] font-bold text-[#E89B55] underline"
          >
            Explorar NFTs
          </Link>
        </div>
      ) : (
        <>
          {/* Lista de NFTs adicionados ao carrinho. */}
          <div className="flex flex-col gap-4">
            {items.map(({ nft, edition, quantity, available }) => (
              <article
                key={`${nft.id}-${edition}`}
                className="relative flex min-h-[86px] overflow-hidden rounded-[14px] bg-[#241612]"
              >
                {/* Imagem do NFT. */}
                <img
                  src={nft.image}
                  alt={`${nft.name} #${nft.id}`}
                  className="h-[86px] w-[86px] shrink-0 object-cover"
                />

                {/* Nome, edição e valor da linha. */}
                <div className="min-w-0 flex-1 px-2 py-2">
                  <h2 className="truncate text-[12px] font-bold text-[#F5F1EB]">
                    {nft.name} #{nft.id}
                  </h2>

                  <p className="mt-1 text-[11px] text-[#CFB28C]">
                    Edição: {edition}
                  </p>

                  <p className="mt-3 text-[15px] font-bold text-[#E89B55]">
                    {formatEth(multiplyEth(nft.price, quantity), 2)} ETH
                  </p>
                </div>

                {/* Quantidade e remoção no lado direito do card. */}
                <div className="flex shrink-0 items-center gap-2 pr-3">
                  <button
                    type="button"
                    aria-label={`Diminuir quantidade de ${nft.name}`} disabled={isPending}
                    onClick={() =>
                      updateQuantity(nft.id, quantity - 1, edition)
                    }
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-[#321F18] text-[16px] text-[#F5F1EB]"
                  >
                    −
                  </button>

                  <span className="min-w-3 text-center text-[12px] text-[#F5F1EB]">
                    {quantity}
                  </span>

                  <button
                    type="button"
                    aria-label={`Aumentar quantidade de ${nft.name}`} disabled={isPending || (available !== undefined && quantity >= available)}
                    onClick={() =>
                      updateQuantity(nft.id, quantity + 1, edition)
                    }
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-[#321F18] text-[16px] text-[#F5F1EB]"
                  >
                    +
                  </button>

                  {/* Botão de remoção independente da quantidade. */}
                  <button
                    type="button"
                    aria-label={`Remover ${nft.name}, edição ${edition}`} disabled={isPending}
                    onClick={() => removeFromCart(nft.id, edition)}
                    className="absolute bottom-2 right-3 text-[#E89B55]"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </article>
            ))}
          </div>

          {/* Painel inferior com cupom e resumo. */}
          <div className="mt-1 rounded-[30px] bg-[#241612] px-5 pb-6 pt-5">
            {/* Campo promocional. */}
            <form
              onSubmit={(event) => {
                event.preventDefault();
                handleApplyPromo();
              }}
              className="flex h-11 items-center overflow-hidden rounded-full border border-[#493021] bg-[#2B1A14]"
            >
              <input
                type="text"
                aria-label="Código promocional"
                placeholder="Digite o código promocional..."
                value={promoCode}
                onChange={(event) => {
                  setPromoCode(event.target.value);
                  setPromoMessage("");
                }}
                className="min-w-0 flex-1 bg-transparent px-3 text-[11px] text-[#F5F1EB] outline-none placeholder:text-[#A98B68]"
              />
              {/* Botão Aplicar com gradiente em tons de laranja. */}

              {/* Botão Aplicar com dimensões e gradiente do Figma. */}

              {/* Botão Aplicar com gradiente e tipografia do Figma. */}
              <button
                type="submit" disabled={isPending} aria-busy={isPending}
                className="h-[50px] w-[97px] shrink-0 rounded-[40px] bg-linear-to-r from-[#D28A4C]/85 to-[#D28A4C] text-[15px] font-bold leading-[16px] tracking-normal text-[#140D0A]"
              >
                Aplicar
              </button>
            </form>

            {/* Feedback de validação do código digitado. */}
            {quote?.coupon && <button type="button" disabled={isPending} onClick={removeCoupon} className="mt-2 text-[11px] text-[#E89B55] underline">Remover cupom {quote.coupon}</button>}
            {promoMessage && (
              <p role="status" className="mt-2 text-[11px] text-[#CFB28C]">
                {promoMessage}
              </p>
            )}

            {/* Subtotal calculado a partir do CartContext. */}
            <div className="mt-4 flex items-center justify-between gap-2 text-[12px] text-[#F5F1EB]">
              <span>Subtotal</span>
              <span>{formatEth(cartTotal, 2)} ETH</span>
            </div>

            {/* Desconto validado e calculado pela API. */}
            <div className="mt-3 flex items-center justify-between gap-2 text-[12px] text-[#F5F1EB]">
              <span>Desconto de lançamento</span>
              <span>(−) {formatEth(discount, 2)}</span>
            </div>

            {/* Taxa de rede estimada. */}
            <div className="mt-3 flex items-start justify-between gap-2 text-[12px] text-[#F5F1EB]">
              <span>Taxa de rede</span>

              <div className="text-right">
                <p>{formatEth(quote?.networkFee ?? "0", 3)} ETH</p>
                <p className="mt-1 text-[10px] text-[#E89B55]">Taxa estimada</p>
              </div>
            </div>

            {/* Total final estimado. */}
            <div className="mt-5 flex items-center justify-between gap-2">
              <span className="text-[14px] font-bold text-[#F5F1EB]">
                Total
              </span>

              <span className="text-[15px] font-bold text-[#E89B55]">
                {formatEth(total, 3)} ETH
              </span>
            </div>

            {/* Abre /payment pelo roteador sem recarregar a página.
                Os itens e a cotação permanecem no cache da mesma identidade. */}
            <Link
              to="/payment" disabled={isPending || !quote?.valid || !!error}
              className="mt-7 flex h-[52px] w-full items-center justify-center rounded-full bg-[#C9894C] text-[13px] font-bold text-[#140D0A]"
            >
              Conectar e finalizar
            </Link>
          </div>
        </>
      )}
    </section>
  );
}




