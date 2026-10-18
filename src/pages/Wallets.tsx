import { FormWithFeedback } from "@/components/ui/FormWithFeedback";
import { useRef, useState, type FormEvent, type Ref } from "react";
import { useAuth } from "@/contexts/auth-store";

import { AccountLayout } from "@/components/account/AccountLayout";
import { AccountField, accountInputStyle, accountSelectStyle } from "@/components/account/AccountFields";
import { emptyWallet, type CollectorWallet, type WalletSettings } from "@/lib/accountStorage";
import { reportFieldError } from "@/lib/formValidation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { accountApi, walletsQuery } from "@/api/account";
import { AccountQueryFeedback } from "@/components/account/AccountQueryFeedback";
import { apiErrorMessage } from "@/api/http";
import { apiFormError } from "@/lib/apiFormError";

// WalletFormProps define o cadastro editável, seu prefixo de ids, callbacks e estado de envio.
type WalletFormProps = {
  wallet: CollectorWallet;
  prefix: string;
  onChange: (wallet: CollectorWallet) => void;
  onSave: (form: HTMLFormElement) => void;
  firstInputRef?: Ref<HTMLInputElement>;
  busy?: boolean;
};

/** Formulário reutilizado nas carteiras principal e secundária, com ids independentes. */
function WalletForm({ wallet, prefix, onChange, onSave, firstInputRef, busy }: WalletFormProps) {
  // update altera o campo field da carteira em edição para value, preservando os demais campos.
  function update(field: keyof CollectorWallet, value: string) {
    onChange({ ...wallet, [field]: value });
  }

  return (
    <FormWithFeedback onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); onSave(event.currentTarget); }} className="mt-6">
      {/* Mesmos campos e ordem do frame Desktop / Carteiras, em duas colunas. */}
      <div className="grid grid-cols-2 gap-x-7 gap-y-3 max-[767px]:grid-cols-1">
        <AccountField label="Nome de exibição" required><input ref={firstInputRef} required name="displayName" value={wallet.displayName} onChange={(event) => update("displayName", event.target.value)} className={accountInputStyle} /></AccountField>
        <AccountField label="Apelido da carteira" required><input required name="alias" value={wallet.alias} onChange={(event) => update("alias", event.target.value)} className={accountInputStyle} /></AccountField>
        <AccountField label="Rede" required><select required name="network" value={wallet.network} onChange={(event) => update("network", event.target.value)} className={accountSelectStyle}><option value="" disabled>Selecione uma rede</option>{["Ethereum", "Polygon", "Solana"].map((network) => <option key={network}>{network}</option>)}</select></AccountField>
        <AccountField label="Nome do perfil" required><input required name="profileName" value={wallet.profileName} onChange={(event) => update("profileName", event.target.value)} className={accountInputStyle} /></AccountField>
        <AccountField label="Endereço da carteira" required><input required spellCheck={false} placeholder="Endereço 0x da carteira" name="address" value={wallet.address} onChange={(event) => update("address", event.target.value)} className={accountInputStyle} /></AccountField>
        <label className="flex items-end"><span className="sr-only">ENS ou carteira secundária (opcional)</span><input spellCheck={false} placeholder="ENS ou carteira secundária (opcional)" name="secondaryAddress" value={wallet.secondaryAddress} onChange={(event) => update("secondaryAddress", event.target.value)} className={accountInputStyle} /></label>
        <AccountField label="Tipo de carteira" required><select required name="provider" value={wallet.provider} onChange={(event) => update("provider", event.target.value)} className={accountSelectStyle}><option value="" disabled>Selecione uma carteira</option>{["WalletConnect", "MetaMask", "Coinbase Wallet"].map((provider) => <option key={provider}>{provider}</option>)}</select></AccountField>
        <AccountField label="Código de indicação" required><input required name="referralCode" value={wallet.referralCode} onChange={(event) => update("referralCode", event.target.value)} className={accountInputStyle} /></AccountField>
        <AccountField label="E-mail" required><input type="email" required name="email" value={wallet.email} onChange={(event) => update("email", event.target.value)} className={accountInputStyle} /></AccountField>
        {/* O sufixo .eth usa branco nas duas carteiras, conforme o Figma. */}
        <div className="flex min-w-0 flex-col gap-[10px] text-[14px] leading-4"><label htmlFor={`${prefix}-ens`} className="flex h-[29px] items-center">Nome ENS<span aria-hidden="true" className="ml-1 text-[22px] text-[#F0805F]">*</span></label><div className="flex gap-3"><select aria-label={`Sufixo ENS da carteira ${prefix === "primary" ? "principal" : "secundária"}`} defaultValue=".eth" className={`${accountInputStyle} w-[78px]! shrink-0`}><option>.eth</option></select><input id={`${prefix}-ens`} required name="ensName" value={wallet.ensName} onChange={(event) => update("ensName", event.target.value)} className={accountInputStyle} /></div></div>
      </div>
      <button type="submit" disabled={busy} aria-busy={busy} className="mt-8 h-10 w-[132px] rounded-[3px] bg-[#D28A4C] text-[14px] font-bold text-[#140D0A]">Salvar carteira</button>
    </FormWithFeedback>
  );
}

/** Gerencia os dois cadastros locais; não solicita assinaturas nem conecta carteiras reais. */
export function Wallets() {
  // user identifica a conta dona dos cadastros de carteiras.
  const { user } = useAuth();
  // query recupera principal e secundária e fornece os estados de leitura do recurso.
  const query = useQuery(walletsQuery(user!.id));
  if (!query.data) return <AccountQueryFeedback error={query.error} retry={() => void query.refetch()} />;
  return <WalletsForm initial={query.data} />;
}

// WalletsForm recebe initial como conjunto confirmado e mantém rascunhos independentes das duas seções.
function WalletsForm({ initial }: { initial: WalletSettings }) {
  // user contém a conta autenticada; os demais dados desta desestruturação informam a recuperação da sessão quando presentes.
  const { user } = useAuth();
  // settings guarda as carteiras editáveis da conta atual, com principal e secundária separadas.
  const [settings, setSettings] = useState(initial);
  // client mantém o cache das carteiras alinhado à última resposta confirmada.
  const client = useQueryClient();
  // mutation grava somente a carteira solicitada, sem retry automático de uma escrita.
  const mutation = useMutation({ mutationFn: accountApi.saveWallet, retry: false });
  // sameAsPrimary indica se a seção secundária deve reutilizar os dados da principal.
  const [sameAsPrimary, setSameAsPrimary] = useState(false);
  // message guarda o feedback exibido ao usuário; o respectivo setter atualiza essa mensagem.
  const [message, setMessage] = useState("");
  // primaryInput mantém o campo principal disponível para posicionar o foco ao adicionar ou editar.
  const primaryInput = useRef<HTMLInputElement>(null);

  // Cada botão salva apenas a seção correspondente, preservando a outra seção já salva.
  async function handleSave(section: "primary" | "secondary", form: HTMLFormElement) {
    if (mutation.isPending) return;
    // wallet é a carteira da seção que está sendo validada e salva.
    const wallet = settings[section];
    if (!wallet) return;
    // requiredFields exclui o endereço secundário opcional antes de verificar os campos obrigatórios.
    const requiredFields = Object.entries(wallet).filter(([key]) => key !== "secondaryAddress");
    if (requiredFields.some(([, value]) => !value.trim())) {
      // field identifica o primeiro atributo obrigatório vazio para associar a mensagem ao controle.
      const field = requiredFields.find(([, value]) => !value.trim())?.[0];
      if (field) reportFieldError(form, field, "Preencha o campo sem usar apenas espaços.");
      return;
    }
    try {
      // saved é o conjunto de carteiras devolvido após salvar a seção, preservando o cadastro da outra.
      const saved = await mutation.mutateAsync({ slot: section, wallet });
      client.setQueryData(walletsQuery(user!.id).queryKey, saved);
      setMessage(`Carteira ${section === "primary" ? "principal" : "secundária"} salva na simulação e disponível no pagamento.`);
    } catch (error) {
      apiFormError(error, form);
      setMessage(apiErrorMessage(error));
    }
  }

  return (
    <AccountLayout>
      {/* A carteira principal fica sempre aberta, como no frame de referência. */}
      <section aria-label="Carteira principal">
        <div className="flex items-center justify-between gap-4"><h1 className="text-[16px] font-bold leading-4">Carteira principal</h1><button type="button" onClick={() => primaryInput.current?.focus()} className="text-[14px] text-[#D28A4C]">Adicionar</button></div>
        <p className="mt-2 text-[12px] leading-4 text-[#CFB28C]">Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.</p>
        <WalletForm prefix="primary" wallet={settings.primary} firstInputRef={primaryInput} onChange={(primary) => { setSettings((current) => ({ ...current, primary })); setMessage(""); }} onSave={form => handleSave("primary", form)} />
      </section>

      {/* O formulário secundário só aparece após Adicionar; copiar a principal gera um rascunho. */}
      <section aria-label="Carteira secundária" className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-[16px] font-bold leading-4">Carteira secundária</h2><div className="flex flex-wrap items-center gap-3"><label className="flex items-center gap-2 text-[12px]"><input type="checkbox" checked={sameAsPrimary} onChange={(event) => { /* same representa o novo estado da opção de reutilizar a carteira principal. */ const same = event.target.checked; setSameAsPrimary(same); if (same && settings.secondary) setSettings((current) => ({ ...current, secondary: { ...current.primary } })); }} className="h-4 w-4 appearance-none rounded-full border border-[#B39463] checked:border-[#D28A4C] checked:bg-[radial-gradient(circle,#D28A4C_0%,#D28A4C_45%,transparent_50%)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D28A4C]" />Igual à carteira principal</label><button type="button" onClick={() => { setSettings((current) => ({ ...current, secondary: current.secondary ?? (sameAsPrimary ? { ...current.primary } : { ...emptyWallet }) })); setMessage(""); }} className="text-[14px] text-[#D28A4C]">Adicionar</button></div></div>
        {settings.secondary ? <WalletForm prefix="secondary" wallet={settings.secondary} onChange={(secondary) => { setSameAsPrimary(false); setSettings((current) => ({ ...current, secondary })); setMessage(""); }} onSave={form => handleSave("secondary", form)} /> : <p className="mt-3 text-[12px] text-[#CFB28C]">Você ainda não adicionou uma carteira secundária.</p>}
      </section>
      {/* Diferencia persistência local de conexão ou verificação de propriedade real. */}
      {message && <p role="status" className="mt-5 text-[13px] leading-5 text-[#CFB28C]">{message}</p>}
    </AccountLayout>
  );
}

