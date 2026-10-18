import { useModalInert } from "@/lib/useModalInert";
import { FormWithFeedback } from "@/components/ui/FormWithFeedback";
import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import type { AuthForm } from "./useAuthForm";

// auth reúne campos e ações de autenticação; onClose fecha a apresentação mobile.
type AuthMobileProps = { auth: AuthForm; onClose: () => void };

// inputClass padroniza altura, borda, cor e foco dos campos no layout mobile.
const inputClass = "h-[50px] w-full min-w-0 rounded-[10px] border border-[#3F2319] bg-transparent px-4 text-[14px] text-[#F5F1EB] outline-none placeholder:text-[#B39463] focus:border-[#D28A4C]";

// AuthMobile apresenta o formulário compartilhado em tela estreita, preservando validação e controle de foco.
export function AuthMobile({ auth, onClose }: AuthMobileProps) {
  // Os campos, setters e ações de auth são compartilhados pelos dois layouts; mode define entrada ou cadastro.
  const { mode, username, setUsername, email, setEmail, password, setPassword, confirmPassword, setConfirmPassword, showPassword, setShowPassword, message, setMessage, changeMode, handleSubmit } = auth;
  // showConfirmation controla a visibilidade da confirmação de senha, independentemente do campo principal.
  const [showConfirmation, setShowConfirmation] = useState(false);
  // dialogRef mantém a referência ao elemento do diálogo para controlar foco e teclado.
  const dialogRef = useRef<HTMLElement>(null);
  useModalInert(dialogRef);
  // login indica se o diálogo está no modo de entrada ou de criação de conta.
  const login = mode === "login";

  // Ao abrir, posiciona o foco e prepara a navegação do diálogo; a limpeza desfaz os efeitos ao fechar.
  useEffect(() => {
    // previousFocus guarda o elemento que tinha foco antes da abertura, permitindo devolvê-lo ao fechar.
    const previousFocus = document.activeElement;
    // previousOverflow preserva a configuração de rolagem anterior ao bloqueio do fundo da página.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-[#140D0A]">
      <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="auth-mobile-title"
        className="mx-auto flex h-dvh min-h-dvh max-h-dvh w-full max-w-[414px] flex-col overflow-y-auto rounded-[40px] bg-[#140D0A] px-7 pb-[max(24px,env(safe-area-inset-bottom))] pt-20 text-[#F5F1EB] outline-none"
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          // controls lista os controles navegáveis para manter a tecla Tab dentro do diálogo.
          const controls = dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)');
          if (!controls?.length) return;
          // first identifica o primeiro controle do diálogo para fechar o ciclo de navegação por teclado.
          const first = controls[0];
          // last identifica o último controle do diálogo para fechar o ciclo de navegação por teclado.
          const last = controls[controls.length - 1];
          if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
            event.preventDefault(); last.focus();
          } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialogRef.current)) {
            event.preventDefault(); first.focus();
          }
        }}>
        <button type="button" onClick={onClose} aria-label="Fechar e voltar à Kurio" className="mx-auto flex h-[140px] shrink-0 items-center justify-center text-[32px] font-bold tracking-[0.1em] focus-visible:outline-2 focus-visible:outline-[#D28A4C]">KURIO</button>
        <h1 id="auth-mobile-title" className={`mb-8 mt-8 text-center font-bold ${login ? "text-[20px]" : "text-[18px]"}`}>
          {login ? "Entrar" : "Criar perfil de colecionador"}
        </h1>
        <FormWithFeedback key={mode} onSubmit={handleSubmit}>
          <div className="flex flex-col gap-3">
            {!login && <input required autoComplete="username" aria-label="Nome de usuário" name="username" aria-invalid={!!auth.fieldErrors.username} aria-describedby={message ? "auth-feedback" : undefined} placeholder="Nome de usuário" value={username} onChange={e => setUsername(e.target.value)} className={`${inputClass} text-center`} />}
            <input required type="email" autoComplete="email" aria-label="E-mail" name="email" aria-invalid={!!auth.fieldErrors.email} aria-describedby={message ? "auth-feedback" : undefined} placeholder={login ? "contato@email.com" : "Digite seu e-mail"} value={email} onChange={e => setEmail(e.target.value)} className={inputClass} />
            <div className="relative">
              <input required type={showPassword ? "text" : "password"} autoComplete={login ? "current-password" : "new-password"} aria-label="Senha" name="password" aria-invalid={!!auth.fieldErrors.password} aria-describedby={message ? "auth-feedback" : undefined} placeholder={login ? "************" : "Senha"} value={password} onChange={e => setPassword(e.target.value)} className={`${inputClass} pr-12 ${login ? "border-[#D28A4C] placeholder:text-[#F5F1EB]" : ""}`} />
              <button type="button" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} aria-pressed={showPassword} onClick={() => setShowPassword(v => !v)} className="absolute right-0 top-0 flex h-[50px] w-12 items-center justify-center text-[#B39463]">{showPassword ? <Eye size={17} /> : <EyeOff size={17} />}</button>
            </div>
            {!login && <div className="relative">
              <input required type={showConfirmation ? "text" : "password"} autoComplete="new-password" aria-label="Confirmar senha" name="confirmPassword" aria-invalid={!!auth.fieldErrors.confirmPassword} aria-describedby={message ? "auth-feedback" : undefined} placeholder="Confirmar senha" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={`${inputClass} pr-12`} />
              <button type="button" aria-label={showConfirmation ? "Ocultar confirmação de senha" : "Mostrar confirmação de senha"} aria-pressed={showConfirmation} onClick={() => setShowConfirmation(v => !v)} className="absolute right-0 top-0 flex h-[50px] w-12 items-center justify-center text-[#B39463]">{showConfirmation ? <Eye size={17} /> : <EyeOff size={17} />}</button>
            </div>}
          </div>
          {login && <button type="button" onClick={() => setMessage("Recuperação de senha ainda não disponível.")} className="mt-2 block min-h-6 w-full text-right text-[14px] text-[#D28A4C]">Esqueceu a senha?</button>}
          <button type="submit" disabled={auth.isSubmitting} aria-busy={auth.isSubmitting} className="mt-10 h-[60px] w-full rounded-[10px] bg-[#D28A4C] text-[16px] font-bold text-[#140D0A] hover:bg-[#E89B55]">{auth.isSubmitting ? "Aguarde…" : login ? "Entrar" : "Criar perfil"}</button>
          {message && <p id="auth-feedback" role="alert" className="mt-3 text-center text-[12px] leading-5 text-[#E89B55]">{[...new Set([message, ...Object.values(auth.fieldErrors)])].join(" ")}</p>}
        </FormWithFeedback>
        <div className="mt-10 flex flex-col gap-3">
          <div className="flex items-center gap-3 text-[12px]"><span className="h-px flex-1 bg-[#3F2319]" />Ou continue com<span className="h-px flex-1 bg-[#3F2319]" /></div>
          {(["Google", "Facebook"] as const).map(provider => <button key={provider} type="button" onClick={() => setMessage(`Login com ${provider} ainda não disponível.`)} className="flex h-10 w-full items-center justify-center gap-3 rounded-[5px] border border-[#3F2319] text-[12px]">
            <img src={`/icons/auth/${provider}1.svg`} alt="" aria-hidden="true" className="h-5 w-5 object-contain" />Continuar com {provider}
          </button>)}
        </div>
        <button type="button" onClick={() => { changeMode(login ? "register" : "login"); setShowConfirmation(false); }} className="mb-0 mt-8 min-h-11 text-center text-[14px] text-[#B39463]">
          {login ? "Novo na Kurio? Crie uma conta" : "Já tem uma conta? Entre"}
        </button>
      </section>
    </div>
  );
}


