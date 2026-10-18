import { FormWithFeedback } from "@/components/ui/FormWithFeedback";
import { displayEth as formatEth, multiplyEth } from "@/lib/money";
import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";

import { useCart } from "@/contexts/cart-store";
import { Footer } from "@/components/layout/Footer";
import { useCheckoutDraft } from "@/lib/useCheckoutDraft";
import { CartFeedback } from "@/components/cart/CartFeedback";

// As propriedades compartilham provedor, envio validado e bloqueio de processamento com o pagamento mobile.
type PaymentDesktopProps = {
  selectedProvider: string;
  onSelectProvider: (provider: string) => void;
  onConfirm: (collector: Record<string, string>, form: HTMLFormElement) => void;
  orderBusy: boolean;
};

// Borda e tipografia compartilhadas por todos os campos do formulário desktop.
const fieldBaseStyle = "h-10 w-full min-w-0 rounded-[3px] border border-[#3F2319] bg-transparent px-3 text-[14px] outline-none placeholder:text-[#B39463] focus:border-[#D28A4C]";
// Inputs usam texto claro; selects usam o tom alaranjado da referência.
// Cada controle recebe uma única classe de cor, evitando conflito entre utilitários.
const fieldStyle = `${fieldBaseStyle} text-[#F5F1EB]`;
// selectStyle completa o estilo base com o tom alaranjado dos seletores do Figma.
const selectStyle = `${fieldBaseStyle} text-[#B39463]`;
// radioStyle centraliza as classes dos seletores de carteira para manter cores, foco e seleção consistentes.
const radioStyle = "h-4 w-4 shrink-0 appearance-none rounded-full border border-[#B39463] checked:border-[#D28A4C] checked:bg-[radial-gradient(circle,#D28A4C_0%,#D28A4C_45%,transparent_50%)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D28A4C]";

// Agrupa rótulo e controle; o asterisco é visual, enquanto required fica no input.
function Field({ label, required = false, children }: { label: string; required?: boolean; children: ReactNode }) {
  return <label className="flex min-w-0 flex-col gap-2 text-[14px] leading-4"><span>{label}{required && <span aria-hidden="true" className="ml-1 text-[#F0805F]">*</span>}</span>{children}</label>;
}

// A seta decorativa mantém o aspecto do Figma sem substituir o select nativo acessível.
function SelectField({ label, name, placeholder, options, initialValue = "" }: { label: string; name: string; placeholder: string; options: string[]; initialValue?: string }) {
  return (
    <Field label={label} required>
      <span className="relative block">
        <select name={name} required defaultValue={initialValue} className={`${selectStyle} appearance-none pr-9`}>
          <option value="" disabled>{placeholder}</option>
          {options.map((option) => <option key={option} value={option} className="bg-[#241612]">{option}</option>)}
        </select>
        <ChevronDown aria-hidden="true" size={16} className="pointer-events-none absolute right-3 top-3 text-[#B39463]" />
      </span>
    </Field>
  );
}

/**
 * Frame Desktop / Pagamento: formulário de 763px e resumo de 405px, com gap de 32px.
 * Os campos são validados e enviados como snapshot para o pedido simulado.
 */
export function PaymentDesktop({ selectedProvider, onSelectProvider, onConfirm, orderBusy }: PaymentDesktopProps) {
  // draft contém o rascunho da conta; updateDraft grava a alteração de um campo sem misturar usuários.
  const { draft, updateDraft } = useCheckoutDraft("form");
  // items reúne as linhas do carrinho; os demais valores expõem cotação, carregamento e ações da mesma identidade.
  const { items, cartTotal, quote, isPending, isLoading, error, applyCoupon, removeCoupon } = useCart();
  // useOtherWallet guarda a escolha de usar uma carteira secundária e ativa sua obrigatoriedade.
  const [useOtherWallet, setUseOtherWallet] = useState(draft.useOtherWallet === "true");
  // showPromo controla a abertura do campo de cupom no resumo do pagamento.
  const [showPromo, setShowPromo] = useState(false);
  // promoCode guarda o código digitado no campo promocional; ainda depende da validação da API.
  const [promoCode, setPromoCode] = useState("");
  // promoMessage guarda a mensagem local de validação do campo de cupom.
  const [promoMessage, setPromoMessage] = useState("");
  // total contém o total autoritativo da cotação, já incluindo desconto e taxa de rede.
  const total = quote?.total ?? "0";

  return (
    <main className="mx-auto hidden w-full max-w-[1200px] px-6 pb-6 pt-10 md:block xl:px-0">
      <CartFeedback />
      {/* Caminho de navegação do frame; o cabeçalho global já vem do RootLayout. */}
      <nav aria-label="Caminho de navegação" className="mb-8 text-[14px] leading-4">
        <Link to="/" className="hover:text-[#E89B55]">Início</Link><span> / Mercado / Pagamento</span>
      </nav>

      {/* Sem itens, não há formulário nem confirmação de pedido disponível. */}
      {items.length === 0 ? (
        <section className="rounded-[10px] bg-[#241612] p-8"><h1 className="mb-3 text-[18px] font-bold">Seu carrinho está vazio.</h1><Link to="/" className="text-[#D28A4C] underline">Explorar NFTs</Link></section>
      ) : (
        <div className="grid grid-cols-[minmax(0,763fr)_minmax(0,405fr)] items-start gap-8 max-[1023px]:grid-cols-1">
          {/* Formulário em duas colunas. O botão da coluna direita o submete pelo id.
              A validação ocorre antes de enviar a tentativa para a API. */}
          <FormWithFeedback id="desktop-payment-form" onSubmit={(event) => { event.preventDefault(); onConfirm(Object.fromEntries(Array.from(new FormData(event.currentTarget)).map(([key, value]) => [key, String(value)])), event.currentTarget); }} onChange={event => {
            // control é o campo que disparou a alteração, usado para salvar seu valor no rascunho.
            const control = event.target;
            if ((control instanceof HTMLInputElement || control instanceof HTMLSelectElement || control instanceof HTMLTextAreaElement) && control.name) {
              updateDraft(control.name, control instanceof HTMLInputElement && control.type === "checkbox" ? String(control.checked) : control.value);
            }
          }}>
            <h1 className="mb-3 text-[16px] font-bold leading-4">Perfil do colecionador</h1>
            <div className="grid grid-cols-2 gap-x-6 gap-y-5 max-[1023px]:grid-cols-1">
              <Field label="Nome de exibição" required><input name="displayName" defaultValue={draft.displayName ?? ""} required autoComplete="name" className={fieldStyle} /></Field>
              <Field label="Nome de usuário" required><input name="username" defaultValue={draft.username ?? ""} required autoComplete="username" className={fieldStyle} /></Field>
              <SelectField label="Rede" name="network" initialValue={draft.network} placeholder="Selecione uma rede" options={["Ethereum", "Polygon", "Solana"]} />
              <Field label="Nome do perfil" required><input name="profileName" defaultValue={draft.profileName ?? ""} required className={fieldStyle} /></Field>
              <Field label="Endereço da carteira" required><input name="walletAddress" defaultValue={draft.walletAddress ?? ""} required placeholder="Endereço 0x da carteira" spellCheck={false} className={fieldStyle} /></Field>
              {/* A carteira secundária ocupa a segunda coluna da mesma linha do endereço. */}
              <label className="flex items-end"><span className="sr-only">ENS ou carteira secundária{useOtherWallet ? " (obrigatório)" : " (opcional)"}</span><input name="secondaryWallet" defaultValue={draft.secondaryWallet ?? ""} required={useOtherWallet} placeholder="ENS ou carteira secundária (opcional)" spellCheck={false} className={fieldStyle} /></label>
              <SelectField label="Tipo de carteira" name="walletType" initialValue={draft.walletType} placeholder="Selecione uma carteira" options={["WalletConnect", "MetaMask", "Coinbase Wallet"]} />
              <Field label="Código de indicação" required><input name="referralCode" defaultValue={draft.referralCode ?? ""} required className={fieldStyle} /></Field>
              <Field label="E-mail" required><input name="email" defaultValue={draft.email ?? ""} type="email" required autoComplete="email" className={fieldStyle} /></Field>
              <Field label="Nome ENS" required><select name="ensSuffix" required defaultValue=".eth" className={`${selectStyle} w-fit!`}><option value=".eth" className="bg-[#241612]">.eth</option></select></Field>
            </div>

            {/* A opção torna obrigatório o endereço secundário já visível no formulário. */}
            <label className="mt-6 flex cursor-pointer items-center gap-2 text-[14px]"><input type="checkbox" name="useOtherWallet" checked={useOtherWallet} onChange={(event) => setUseOtherWallet(event.target.checked)} className={radioStyle} />Usar outra carteira?</label>
            <label className="mt-6 flex flex-col gap-3 text-[14px] leading-4">Observação do colecionador (opcional)<textarea name="collectorNote" defaultValue={draft.collectorNote ?? ""} className={`${fieldStyle} h-[150px]! w-[350px]! max-w-full resize-y py-3`} /></label>
          </FormWithFeedback>

          {/* Resumo dinâmico: preço, quantidade e edição vêm do mesmo CartContext do mobile. */}
          <aside aria-label="Resumo do pagamento" className="flex min-w-0 flex-col gap-3 leading-4">
            <h2 className="text-[16px] font-bold leading-4">Seus NFTs</h2>
            <div className="flex justify-between border-b border-[#61452F] pb-3 text-[14px]"><span className="font-bold">NFTs</span><span>Subtotal</span></div>
            <div className="flex flex-col gap-3">
              {items.map(({ nft, edition, quantity }) => (
                <article key={`${nft.id}-${edition}`} className="flex min-h-[70px] items-center gap-2 bg-[#241612] pr-3">
                  <img src={nft.image} alt={`${nft.name} #${nft.id}`} className="h-[70px] w-[70px] shrink-0 rounded-[8px] object-cover" />
                  <div className="min-w-0 flex-1"><h3 className="text-[14px] font-bold leading-4">{nft.name} #{nft.id}</h3><p className="mt-1 text-[12px] leading-4 text-[#B39463]">ID do token: #{nft.id.padStart(4, "0")}</p><span className="sr-only">Edição: {edition}</span></div>
                  <span className="shrink-0 text-[12px] text-[#CFB28C]">(x {quantity})</span>
                  <span className="shrink-0 text-[16px] font-bold text-[#E89B55]">{formatEth(multiplyEth(nft.price, quantity), 2)} ETH</span>
                </article>
              ))}
            </div>

              {/* A API valida o cupom e recalcula o desconto autoritativo. */}
            <button type="button" onClick={() => setShowPromo((current) => !current)} aria-expanded={showPromo} className="text-center text-[14px]">Tem um código promocional? Aplique aqui</button>
            {showPromo && <div><div className="flex gap-2"><input aria-label="Código promocional no pagamento" value={promoCode} onChange={(event) => setPromoCode(event.target.value)} className={fieldStyle} /><button type="button" disabled={isPending} onClick={() => { if (promoCode.trim()) { setPromoMessage(""); applyCoupon(promoCode); } else setPromoMessage("Digite um código promocional."); }} className="text-[12px] text-[#D28A4C]">Aplicar</button></div>{promoMessage && <p role="status" className="mt-2 text-[12px] text-[#CFB28C]">{promoMessage}</p>}</div>}
            {quote?.coupon && <button disabled={isPending} onClick={removeCoupon} className="text-[12px] text-[#E89B55] underline">Remover cupom {quote.coupon}</button>}
            <dl className="grid grid-cols-[1fr_auto] gap-y-4 text-[14px]"><dt>Subtotal</dt><dd className="text-right text-[16px]">{formatEth(cartTotal, 2)} ETH</dd><dt>Desconto do lançamento</dt><dd className="text-right">(-) {formatEth(quote?.discount ?? "0")} ETH</dd><dt>Taxa de rede</dt><dd className="text-right text-[16px]">{formatEth(quote?.networkFee ?? "0", 3)} ETH</dd></dl>
            <p className="text-center text-[12px] text-[#D28A4C]">Taxa estimada</p>
            <div className="flex justify-between border-t border-[#61452F] px-10 pt-3 text-[16px] font-bold"><span>Total</span><span className="text-[#E89B55]">{formatEth(total, 3)} ETH</span></div>

            {/* Radios desktop compartilham a seleção com o mobile, sem conectar serviços reais. */}
            <fieldset className="flex flex-col gap-4"><legend className="mb-4 text-center text-[16px] font-bold">Carteira e rede</legend>
              {[{ id: "walletconnect", label: "WalletConnect" }, { id: "metamask", label: "MetaMask" }, { id: "coinbase", label: "Coinbase Wallet" }].map((provider) => (
                <label key={provider.id} className={`flex h-11 cursor-pointer items-center gap-3 rounded-[3px] border px-3 text-[14px] ${selectedProvider === provider.id ? "border-[#D28A4C]" : "border-[#3F2319]"}`}>
                  <input type="radio" name="desktop-payment-provider" aria-label={provider.label} checked={selectedProvider === provider.id} onChange={() => onSelectProvider(provider.id)} className={radioStyle} />
                  {provider.id === "walletconnect" ? <span aria-hidden="true" className="rounded-[5px] border border-[#61452F] bg-[#3F2319] px-2 py-1 text-[8px] text-[#D28A4C]">METAMASK · WALLETCONNECT · COINBASE</span> : <span>{provider.label}</span>}
                </label>
              ))}
            </fieldset>
            <button type="submit" disabled={orderBusy || isPending || isLoading || !quote?.valid || !!error} form="desktop-payment-form" className="mt-3 flex h-11 w-full items-center justify-center rounded-[5px] bg-[#D28A4C] text-[14px] font-bold text-[#140D0A]">Confirmar compra</button>
          </aside>
        </div>
      )}

      {/* Rodapé compartilhado, separado do checkout pelos 96px definidos no Figma. */}
      <div className="mt-24"><Footer /></div>
    </main>
  );
}


