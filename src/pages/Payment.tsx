import { displayEth as formatEth } from "@/lib/money";
// Hooks de estado e foco, navegação interna e ícones da interface.
import { useRef } from "react";
import { Link } from "@tanstack/react-router";
import { MoreVertical, Wallet } from "lucide-react";

// Itens e taxa compartilhados com o carrinho para manter os totais consistentes.
import { useCart } from "@/contexts/cart-store";
import { OrderConfirmationModal } from "@/components/payment/OrderConfirmationModal";
import { useOrderCheckout } from "@/lib/useOrderCheckout";
import { apiErrorMessage } from "@/api/http";
import type { Network } from "@/api/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { accountApi, connectionQuery, walletsQuery } from "@/api/account";
import { useAuth } from "@/contexts/auth-store";
import { apiFormError } from "@/lib/apiFormError";
import { PaymentDesktop } from "@/components/payment/PaymentDesktop";
import { useCheckoutDraft } from "@/lib/useCheckoutDraft";
import { CartFeedback } from "@/components/cart/CartFeedback";

// Carteiras ilustrativas do Figma; não representam uma conexão real.
// Provedores da referência: a marca usa uma letra ou o ícone de carteira.
const providers = [
  { id: "walletconnect", name: "WalletConnect", mark: "W" },
  { id: "metamask", name: "MetaMask", mark: "M" },
  { id: "coinbase", name: "Coinbase Wallet", mark: null },
];

// Estilo único dos radios: círculo do Figma, seleção laranja e foco visível por teclado.
// O input continua nativo para preservar a navegação por setas e a leitura acessível.
const radioStyle = "h-4 w-4 shrink-0 appearance-none rounded-full border border-[#61452F] checked:border-[#D28A4C] checked:bg-[radial-gradient(circle,#D28A4C_0%,#D28A4C_45%,transparent_50%)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D28A4C]";

/**
 * Layouts mobile e desktop de pagamento, com seleção de provedor e confirmação compartilhadas.
 * A compra usa pedidos pela API simulada; conexões reais com blockchain ficam fora do escopo.
 */
export function Payment() {
  // user identifica a conta cujas carteiras, conexão e pedido serão usados no pagamento.
  const { user } = useAuth();
  // client reconcilia a consulta de conexão depois de conectar ou desconectar uma carteira.
  const client = useQueryClient();
  // walletQuery consulta as carteiras cadastradas da conta, sem usar opções ilustrativas como dados de compra.
  const walletQuery = useQuery(walletsQuery(user!.id));
  // connection representa a carteira e a rede que a API reconhece como conectadas.
  const connection = useQuery(connectionQuery(user!.id));
  // connectionMutation executa conexão ou desconexão simulada e atualiza o estado confirmado pela API.
  const connectionMutation = useMutation({
    mutationFn: async (input: { wallet: "primary" | "secondary"; network: string } | null) => input ? accountApi.connect(input) : accountApi.disconnect(),
    retry: false, onSuccess: () => client.invalidateQueries({ queryKey: connectionQuery(user!.id).queryKey }),
  });
  // Somente carteiras retornadas pela API aparecem no pagamento.
  const wallets = (["primary", "secondary"] as const).flatMap(id => {
    // wallet é o cadastro da seção principal ou secundária que será incluído nas opções disponíveis.
    const wallet = walletQuery.data?.[id];
    return wallet?.address ? [{ id, name: wallet.alias, address: wallet.address, network: wallet.network }] : [];
  });
  // draft contém o rascunho da conta; updateDraft grava a alteração de um campo sem misturar usuários.
  const { draft, updateDraft } = useCheckoutDraft("selection");
  // Mantém o resumo sincronizado com os itens adicionados nas outras telas.
  const { items, quote, isPending, isLoading, error } = useCart();
  // Os dois grupos têm seleções independentes, inicialmente iguais às da referência.
  const selectedWallet = wallets.find(wallet => wallet.id === draft.wallet)?.id ?? wallets[0]?.id ?? "primary";
  // currentWallet contém o cadastro correspondente à seleção que será enviada no pedido.
  const currentWallet = wallets.find(wallet => wallet.id === selectedWallet);
  // connected só é verdadeiro quando a conexão confirmada corresponde à carteira e à rede selecionadas.
  const connected = connection.data?.wallet === selectedWallet && connection.data?.network === currentWallet?.network;
  // selectedProvider identifica o provedor escolhido, compartilhado entre desktop e mobile.
  const selectedProvider = providers.some(provider => provider.id === draft.provider) ? draft.provider : "coinbase";
  // setSelectedWallet grava a seleção de carteira no rascunho da conta.
  const setSelectedWallet = (value: string) => updateDraft("wallet", value);
  // setSelectedProvider grava a seleção do provedor no mesmo rascunho usado pelos dois layouts.
  const setSelectedProvider = (value: string) => updateDraft("provider", value);
  // O estado remoto e a chave persistida permitem recuperar o pedido após falhas.
  const desktopForm = useRef<HTMLFormElement | null>(null);
  // checkout centraliza a tentativa e o estado do pedido, encaminhando erros de campos ao formulário desktop.
  const checkout = useOrderCheckout(error => { if (desktopForm.current) apiFormError(error, desktopForm.current); });
  // Trocar carteira leva o foco à primeira opção para permitir navegação por teclado.
  const walletInput = useRef<HTMLInputElement>(null);
  // Soma a mesma taxa estimada do carrinho apenas quando existem itens.
  const total = quote?.total ?? "0";

  // Envia a cotação revisada; preços e estoque serão revalidados pela API.
  function handleConfirmOrder(collector?: Record<string, string>, form?: HTMLFormElement) {
    desktopForm.current = form ?? null;
    if (!quote?.valid || items.length === 0 || isPending || error) return;
    checkout.submit({
      quoteId: quote.id, quoteExpiresAt: quote.expiresAt,
      provider: providers.find((provider) => provider.id === selectedProvider)!.name,
      network: currentWallet?.network as Network,
      wallet: selectedWallet, collector,
    });
  }

  if (isLoading) return <main className="mx-auto grid max-w-[1200px] gap-8 p-6 md:grid-cols-[2fr_1fr]" role="status" aria-label="Carregando pagamento">
    <div className="catalog-skeleton h-[500px] rounded-[14px]" /><div className="catalog-skeleton h-[400px] rounded-[30px]" />
  </main>;

  return (
    <>
    {/* A conexão é simulada pela API, sem extensões, assinaturas ou dados reais. */}
    {items.length > 0 && <section aria-label="Conexão de carteira" className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-4 p-6 text-[14px] text-[#CFB28C]">
      {walletQuery.isPending || connection.isPending ? <p role="status">Consultando carteiras…</p> : !wallets.length ? <Link to="/wallets" className="text-[#E89B55] underline">Cadastrar carteira para continuar</Link> : <>
        <label>Carteira do pedido<select aria-label="Carteira do pedido" value={selectedWallet} onChange={event => setSelectedWallet(event.target.value)} className="ml-2 max-w-full rounded bg-[#241612] p-3 text-[#B39463]">{wallets.map(wallet => <option key={wallet.id} value={wallet.id}>{wallet.name} · {wallet.network}</option>)}</select></label>
        <button disabled={connectionMutation.isPending} onClick={() => connectionMutation.mutate(connected ? null : { wallet: selectedWallet, network: currentWallet!.network })} className="rounded bg-[#D28A4C] px-4 py-3 text-[#140D0A]">{connected ? "Desconectar carteira" : "Conectar carteira"}</button>
        <p role="status">{connected ? "Carteira conectada na simulação." : "Conecte a carteira para enviar o pedido."}</p>
      </>}
      {(walletQuery.error || connection.error || connectionMutation.error) && <p role="alert">{apiErrorMessage(walletQuery.error ?? connection.error ?? connectionMutation.error)}</p>}
    </section>}
    {/* O resultado do servidor permanece acessível mesmo quando a compra esvazia o carrinho. */}
    {(checkout.orderId || checkout.attempt || checkout.error || checkout.message) && <section aria-label="Estado do pedido" className="mx-auto max-w-[1200px] p-6 text-[#CFB28C]">
      {checkout.message && <p role="status">{checkout.message}</p>}
      {checkout.error && <p role="alert">{apiErrorMessage(checkout.error)}</p>}
      {checkout.busy && <p role="status">Pedido em processamento. Aguarde a confirmação da simulação…</p>}
      {checkout.attempt && <><p>A tentativa foi preservada. Recupere o resultado antes de iniciar outra compra.</p><button disabled={checkout.busy} onClick={checkout.recover} className="mt-3 text-[#E89B55] underline">Recuperar tentativa</button></>}
      {checkout.order?.status === "declined" && <><p role="alert">{checkout.order.reason}</p><button onClick={checkout.close} className="mt-3 text-[#E89B55] underline">Revisar e tentar novamente</button></>}
      {checkout.orderId && checkout.error && <button onClick={() => void checkout.refresh()} className="mt-3 text-[#E89B55] underline">Consultar pedido novamente</button>}
    </section>}
    {/* Frame mobile de até 414px, padding de 28px/32px e raio de 40px.
        A partir de 768px, o checkout desktop assume a apresentação. */}
    <main className="mx-auto flex min-h-[100svh] w-full max-w-[414px] flex-col justify-between gap-8 rounded-[40px] bg-[#140D0A] px-7 py-8 text-[#F5F1EB] md:hidden">
      <CartFeedback />
      {/* Conteúdo superior: cabeçalho, carteiras, provedores e total. */}
      <div className="flex flex-col gap-4">
        {/* Volta ao carrinho sem apagar os itens ou suas quantidades. */}
        <header className="flex h-11 items-center gap-6">
          <Link to="/cart" aria-label="Voltar ao carrinho" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2B1A14]">
            <img src="/icons/arrow2.svg" alt="" className="h-4 w-4" />
          </Link>
          <h1 className="text-[20px] font-bold leading-6 max-[374px]:text-[16px]">Pagamento com carteira</h1>
        </header>

        {/* Sem itens, oferece retorno ao catálogo e oculta as opções de pagamento. */}
        {items.length === 0 ? (
          <div className="rounded-[15px] bg-[#241612] p-6 text-[14px] leading-6">
            <p>Seu carrinho está vazio.</p>
            <Link to="/" className="mt-3 inline-block font-bold text-[#D28A4C] underline">Explorar NFTs</Link>
          </div>
        ) : (
          <>
            {/* O título segue o Figma; a ação posiciona o foco no grupo abaixo. */}
            <div className="flex items-center justify-between gap-3 text-[16px] leading-4">
              <h2 className="font-bold">Carteira conectada</h2>
              <button type="button" onClick={() => walletInput.current?.focus()} className="text-[14px] font-bold text-[#E89B55]">Trocar carteira</button>
            </div>

            {/* Cartões de 93px mínimos separados por 20px. O label torna o cartão
                clicável e o mesmo name permite selecionar somente uma carteira. */}
            <fieldset aria-label="Carteiras de demonstração" className="flex min-w-0 flex-col gap-5">
              {wallets.map((wallet, index) => (
                <label key={wallet.id} className="flex min-h-[93px] cursor-pointer items-center gap-5 rounded-[15px] bg-[#241612] px-5 py-4 shadow-[0_0_20px_#0A060473]">
                  <input ref={index === 0 ? walletInput : undefined} type="radio" name="payment-wallet" value={wallet.id} checked={selectedWallet === wallet.id} onChange={() => { setSelectedWallet(wallet.id); }} className={radioStyle} />
                  {/* Nome, endereço e rede, com quebra de linha em telas estreitas. */}
                  <span className="flex min-w-0 flex-1 flex-col gap-2">
                    <span className="text-[16px] font-bold leading-4">{wallet.name}</span>
                    <span className="break-all text-[14px] leading-4 text-[#CFB28C]">{wallet.address}<br />{wallet.network}</span>
                  </span>
                  {/* Reticências decorativas do Figma; não há menu implementado. */}
                  <MoreVertical aria-hidden="true" size={20} className="shrink-0 text-[#B39463]" />
                </label>
              ))}
            </fieldset>

            {/* Grupo independente de provedores, com opções de 65px e raio de 15px.
                Trocar o provedor preserva a carteira escolhida no grupo anterior. */}
            <fieldset className="flex min-w-0 flex-col gap-4">
              <legend className="mb-4 text-[16px] font-bold leading-4">Carteira e rede</legend>
              {providers.map((provider) => (
                <label key={provider.id} className="flex h-[65px] cursor-pointer items-center gap-3 rounded-[15px] bg-[#241612] px-4 shadow-[0_0_20px_#0A060473]">
                  <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#61452F]/40 bg-[#2B1A14] text-[14px] text-[#D28A4C]">
                    {provider.mark ?? <Wallet size={20} strokeWidth={1.5} />}
                  </span>
                  <span className="min-w-0 flex-1 text-[14px] leading-4">{provider.name}</span>
                  <input type="radio" name="payment-provider" value={provider.id} checked={selectedProvider === provider.id} onChange={() => { setSelectedProvider(provider.id); }} className={radioStyle} />
                </label>
              ))}
            </fieldset>

            {/* Total em ETH com três casas decimais, igual ao resumo do carrinho. */}
            <p className="flex items-center justify-end gap-8 text-[16px] font-bold leading-4">
              <span>Total:</span><span className="text-[18px] text-[#E89B55]">{formatEth(total, 3)} ETH</span>
            </p>
          </>
        )}
      </div>

      {/* Envia a tentativa; a API preserva o carrinho até confirmar o resultado. */}
      {items.length > 0 && (
        <div>
          <button type="button" onClick={() => handleConfirmOrder()} disabled={!connected || connectionMutation.isPending || checkout.busy || !!checkout.attempt || !!checkout.orderId || isPending || isLoading || !quote?.valid || !!error} className="flex h-[60px] w-full items-center justify-center rounded-[40px] bg-linear-to-r from-[#D28A4C] to-[#D28A4C]/80 text-[16px] font-bold text-[#140D0A]">
            Confirmar compra
          </button>
        </div>
      )}
    </main>
    {/* Desktop usa formulário e resumo em duas colunas, conforme seu frame próprio. */}
    <PaymentDesktop selectedProvider={selectedProvider} onSelectProvider={setSelectedProvider} onConfirm={handleConfirmOrder} orderBusy={!connected || connectionMutation.isPending || checkout.busy || !!checkout.attempt || !!checkout.orderId} />
    {/* O modal fica fora dos layouts ocultáveis para funcionar em ambos os tamanhos. */}
    {checkout.order?.status === "confirmed" && <OrderConfirmationModal order={checkout.order} onClose={checkout.close} />}
    </>
  );
}

