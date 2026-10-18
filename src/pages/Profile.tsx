import { FormWithFeedback } from "@/components/ui/FormWithFeedback";
import { useRef, useState, type FormEvent } from "react";
import { Eye, EyeOff, Image } from "lucide-react";
import { useAuth } from "@/contexts/auth-store";

import { AccountLayout } from "@/components/account/AccountLayout";
import { AccountField, accountInputStyle } from "@/components/account/AccountFields";
import { type CollectorProfile } from "@/lib/accountStorage";
import { reportFieldError } from "@/lib/formValidation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { accountApi, profileQuery } from "@/api/account";
import { AccountQueryFeedback } from "@/components/account/AccountQueryFeedback";
import { apiErrorMessage } from "@/api/http";
import { apiFormError } from "@/lib/apiFormError";

/** Campos de senha mantidos apenas em memória, nunca salvos no localStorage. */
const passwordFields = [
  { key: "current", label: "Senha atual", autoComplete: "current-password" },
  { key: "next", label: "Nova senha", autoComplete: "new-password" },
  { key: "confirmation", label: "Confirmar nova senha", autoComplete: "new-password" },
] as const;

// Profile consulta o recurso privado e só monta o formulário depois de receber os dados da API.
export function Profile() {
  // user identifica a conta cujo perfil será consultado e editado.
  const { user } = useAuth();
  // query reúne o perfil remoto e os estados utilizados para carregamento, erro e nova tentativa.
  const query = useQuery(profileQuery(user!.id));
  if (!query.data) return <AccountQueryFeedback error={query.error} retry={() => void query.refetch()} />;
  return <ProfileForm initial={query.data} />;
}

// ProfileForm recebe initial como rascunho inicial e mantém alterações locais até salvar.
function ProfileForm({ initial }: { initial: CollectorProfile }) {
  // A rota privada garante a identidade; não reutiliza o perfil global das prévias antigas.
  const { user } = useAuth();
  // profile guarda os dados editáveis da conta atual antes de clicar em Salvar.
  const [profile, setProfile] = useState(initial);
  // client atualiza os caches de perfil e sessão após a confirmação da edição.
  const client = useQueryClient();
  // mutation envia dados e eventual alteração de senha à API, sem repetir automaticamente a escrita.
  const mutation = useMutation({ mutationFn: accountApi.saveProfile, retry: false });
  // passwords mantém as senhas digitadas somente em memória; elas não entram no perfil persistido.
  const [passwords, setPasswords] = useState({ current: "", next: "", confirmation: "" });
  // visiblePasswords controla separadamente a visibilidade dos três campos de senha.
  const [visiblePasswords, setVisiblePasswords] = useState({ current: false, next: false, confirmation: false });
  // message guarda o feedback exibido ao usuário; o respectivo setter atualiza essa mensagem.
  const [message, setMessage] = useState("");
  // fileInput permite abrir o seletor de arquivos pelo botão visual de alteração do avatar.
  const fileInput = useRef<HTMLInputElement>(null);

  // Editar um campo limpa o feedback anterior, sem persistir antes de clicar em Salvar.
  function updateProfile(field: keyof CollectorProfile, value: string) {
    setProfile((current) => ({ ...current, [field]: value }));
    setMessage("");
  }

  // Aceita apenas imagens raster pequenas; SVG e outros tipos não são carregados.
  function handleAvatar(file: File | undefined) {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 2 * 1024 * 1024) {
      setMessage("Escolha uma imagem PNG, JPG ou WebP de até 2 MB.");
      return;
    }
    // reader converte a imagem raster aprovada em uma URL de dados para a prévia do avatar.
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") updateProfile("avatar", reader.result);
    };
    reader.onerror = () => setMessage("Não foi possível ler essa imagem. Tente outro arquivo.");
    reader.readAsDataURL(file);
  }

  // A API valida perfil e senha antes de persistir qualquer alteração.
  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // form é o formulário submetido, utilizado para associar mensagens aos controles inválidos.
    const form = event.currentTarget;
    if (mutation.isPending) return;
    // wantsPasswordChange indica se algum campo de senha foi preenchido e exige validar o conjunto.
    const wantsPasswordChange = Object.values(passwords).some(Boolean);
    if (wantsPasswordChange && (!passwords.current || passwords.next.length < 8 || passwords.next !== passwords.confirmation)) {
      // A regra envolve três campos, mas o erro e o foco apontam para aquele que precisa de correção.
      const field = !passwords.current ? "current" : passwords.next.length < 8 ? "next" : "confirmation";
      reportFieldError(event.currentTarget, `password-${field}`, field === "current" ? "Informe a senha atual." : field === "next" ? "Use ao menos 8 caracteres na nova senha." : "As senhas não coincidem.");
      return;
    }
    if ([profile.displayName, profile.username, profile.email, profile.ensName, profile.walletAlias].some((value) => !value.trim())) {
      // field identifica o primeiro dado obrigatório vazio ou preenchido só com espaços.
      const field = (["displayName", "username", "email", "ensName", "walletAlias"] as const).find(key => !profile[key].trim());
      if (field) reportFieldError(event.currentTarget, field, "Preencha o campo sem usar apenas espaços.");
      return;
    }
    try {
      // saved contém o perfil validado pela API, usado para substituir o rascunho e atualizar o cache.
      const saved = await mutation.mutateAsync({ profile, password: wantsPasswordChange ? { current: passwords.current, next: passwords.next } : undefined });
      client.setQueryData(profileQuery(user!.id).queryKey, saved);
      void client.invalidateQueries({ queryKey: ["session"] });
      setMessage(wantsPasswordChange ? "Perfil e senha atualizados na simulação." : "Perfil atualizado.");
      setPasswords({ current: "", next: "", confirmation: "" });
    } catch (error) {
      apiFormError(error, form);
      setMessage(apiErrorMessage(error));
    }
  }

  return (
    <AccountLayout>
      {/* Formulário do frame Desktop / Perfil do Colecionador, organizado por blocos. */}
      <FormWithFeedback onSubmit={handleSave} className="flex flex-col gap-8">
        <h1 className="text-[16px] font-bold leading-4">Perfil do colecionador</h1>

        {/* Dados pessoais em duas colunas de 417px com gap de 28px. */}
        <div className="grid grid-cols-2 gap-x-7 gap-y-6 max-[767px]:grid-cols-1">
          <AccountField label="Nome de exibição" required><input name="displayName" required autoComplete="name" value={profile.displayName} onChange={(event) => updateProfile("displayName", event.target.value)} className={accountInputStyle} /></AccountField>
          <AccountField label="Nome de usuário" required><input name="username" required autoComplete="username" value={profile.username} onChange={(event) => updateProfile("username", event.target.value)} className={accountInputStyle} /></AccountField>
          <AccountField label="E-mail" required><input name="email" type="email" required autoComplete="email" value={profile.email} onChange={(event) => updateProfile("email", event.target.value)} className={accountInputStyle} /></AccountField>
          {/* O sufixo ENS usa texto branco neste frame, diferente dos selects alaranjados de rede. */}
          <div className="flex min-w-0 flex-col gap-[10px] text-[14px] leading-4"><label htmlFor="profile-ens" className="flex h-[29px] items-center">Nome ENS<span aria-hidden="true" className="ml-1 text-[22px] text-[#F0805F]">*</span></label><div className="flex gap-3"><select aria-label="Sufixo ENS" defaultValue=".eth" className={`${accountInputStyle} w-[78px]! shrink-0`}><option>.eth</option></select><input id="profile-ens" name="ensName" required value={profile.ensName} onChange={(event) => updateProfile("ensName", event.target.value)} className={accountInputStyle} /></div></div>
          <AccountField label="Apelido da carteira" required><input name="walletAlias" required value={profile.walletAlias} onChange={(event) => updateProfile("walletAlias", event.target.value)} className={accountInputStyle} /></AccountField>

          {/* Avatar editável: a prévia muda imediatamente; a persistência ocorre ao salvar. */}
          <div className="flex min-w-0 flex-col gap-[10px]"><span className="flex h-[29px] items-center text-[14px]">Avatar</span><div className="flex flex-wrap items-center gap-5"><div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#2B1A14] text-[#D28A4C]">{profile.avatar ? <img src={profile.avatar} alt="Avatar do colecionador" className="h-full w-full object-cover" /> : <Image size={22} strokeWidth={1.4} aria-hidden="true" />}</div><input ref={fileInput} aria-label="Selecionar imagem do avatar" tabIndex={-1} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => { handleAvatar(event.target.files?.[0]); event.target.value = ""; }} /><button type="button" onClick={() => fileInput.current?.click()} className="h-10 bg-[#D28A4C] px-6 text-[14px] font-bold text-[#140D0A]">Alterar</button><button type="button" onClick={() => updateProfile("avatar", "")} className="text-[12px]">Remover</button></div></div>
        </div>

        {/* Senhas em uma única coluna de 417px, com visibilidade independente. */}
        <section aria-label="Alterar senha" className="flex w-[417px] max-w-full flex-col gap-6">
          <h2 className="text-[16px] font-bold leading-4">Alterar senha</h2>
          {passwordFields.map(({ key, label, autoComplete }) => (
            <label key={key} className="flex flex-col gap-2 text-[14px] leading-[19px]">{label}<span className="relative"><input aria-label={label} name={`password-${key}`} type={visiblePasswords[key] ? "text" : "password"} autoComplete={autoComplete} value={passwords[key]} onChange={(event) => { setPasswords((current) => ({ ...current, [key]: event.target.value })); setMessage(""); }} className={`${accountInputStyle} pr-12`} /><button type="button" aria-label={`${visiblePasswords[key] ? "Ocultar" : "Mostrar"} ${label.toLowerCase()}`} aria-pressed={visiblePasswords[key]} onClick={() => setVisiblePasswords((current) => ({ ...current, [key]: !current[key] }))} className="absolute right-0 top-0 flex h-10 w-12 items-center justify-center text-[#B39463]">{visiblePasswords[key] ? <Eye size={17} /> : <EyeOff size={17} />}</button></span></label>
          ))}
        </section>

        {/* Feedback acessível e confirmação de persistência apenas local. */}
        <div><button type="submit" disabled={mutation.isPending} aria-busy={mutation.isPending} className="h-10 w-[132px] rounded-[3px] bg-[#D28A4C] text-[14px] font-bold text-[#140D0A]">{mutation.isPending ? "Salvando…" : "Salvar"}</button>{message && <p role="status" className="mt-4 text-[13px] leading-5 text-[#CFB28C]">{message}</p>}</div>
      </FormWithFeedback>
    </AccountLayout>
  );
}

