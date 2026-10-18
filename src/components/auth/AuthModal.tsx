import { useModalInert } from "@/lib/useModalInert";
import { FormWithFeedback } from "@/components/ui/FormWithFeedback";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { Eye, EyeOff, X } from "lucide-react";
import { AuthMobile } from "./AuthMobile";
import { useAuthForm } from "./useAuthForm";
// mobileQuery define o limite de largura que escolhe a apresentação mobile do diálogo.
const mobileQuery = "(max-width: 767px)";
// Assina mudanças de largura e remove o observador quando o React não precisar mais dele.
function subscribeMobile(onChange: () => void) {
  // media observa as mudanças do limite de largura, mantendo a assinatura do React sincronizada.
  const media = window.matchMedia(mobileQuery);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}
// Informa se a largura atual deve usar o formulário mobile.
function getMobileSnapshot() { return window.matchMedia(mobileQuery).matches; }

// onClose fecha o diálogo; onAuthenticated permite retomar o fluxo anterior depois de entrar ou cadastrar.
type AuthModalProps = {
  onClose: () => void;
  onAuthenticated?: () => void;
};

// AuthModal compartilha o formulário entre layouts e recebe as ações de fechamento e autenticação concluída.
export function AuthModal({ onClose, onAuthenticated = onClose }: AuthModalProps) {
  // auth reúne a identidade atual e as operações de entrada, cadastro e saída.
  const auth = useAuthForm(onClose, onAuthenticated);
  // Os campos, setters e ações de auth são compartilhados pelos dois layouts; mode define entrada ou cadastro.
  const { mode, username, setUsername, email, setEmail, password, setPassword, confirmPassword, setConfirmPassword, showPassword, setShowPassword, message, setMessage, changeMode, handleSubmit } = auth;
  // isMobile contém o resultado atual da consulta de mídia, sem duplicar os formulários montados.
  const isMobile = useSyncExternalStore(subscribeMobile, getMobileSnapshot, () => false);
  // dialogRef mantém a referência ao elemento do diálogo para controlar foco e teclado.
  const dialogRef = useRef<HTMLElement>(null);
  useModalInert(dialogRef, !isMobile);

  // Mantém foco e rolagem dentro do diálogo desktop, restaurando o acionador ao fechar.
  useEffect(() => {
    if (isMobile) return;
    // previousFocus guarda o elemento que tinha foco antes da abertura, permitindo devolvê-lo ao fechar.
    const previousFocus = document.activeElement;
    // overflow preserva a rolagem original do documento para restaurá-la ao fechar o diálogo.
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [isMobile]);

  if (isMobile) return <AuthMobile auth={auth} onClose={onClose} />;

  return (
    // Fundo escurecido, mantendo a página visível.
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      onMouseDown={(event) => {
        // Fecha somente ao clicar fora do modal.
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Modal desktop de 500 x 600px, conforme o Figma. */}
      <section
        ref={dialogRef}
        tabIndex={-1}
        onKeyDown={event => {
          if (event.key !== "Tab") return;
          // controls lista os controles navegáveis para manter a tecla Tab dentro do diálogo.
          const controls = dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)');
          if (!controls?.length) return;
          // first identifica o primeiro controle do diálogo para fechar o ciclo de navegação por teclado.
          const first = controls[0], last = controls[controls.length - 1];
          if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) { event.preventDefault(); last.focus(); }
          else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialogRef.current)) { event.preventDefault(); first.focus(); }
        }}
        role="dialog"
        aria-modal="true"
        aria-label={
          mode === "login" ? "Entrar na Kurio" : "Criar conta na Kurio"
        }
        className="relative flex h-[600px] max-h-[calc(100dvh-32px)] min-h-0 w-[500px] max-w-full flex-col overflow-y-auto border-b-[8px] border-[#D28A4C] bg-[#241612] text-[#F5F1EB]"
      >
        {/* Botão de fechar. */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center text-[#D28A4C] hover:text-[#E89B55]"
        >
          <X size={18} />
        </button>

        {/* Cabeçalho e formulário. */}
        <div className="flex flex-col items-center px-[80px] pt-[48px]">
          {/* Abas Entrar e Criar conta. */}
          <div className="flex items-center gap-1 text-[18px] font-bold">
            <button
              type="button"
              onClick={() => changeMode("login")}
              aria-pressed={mode === "login"}
              className={mode === "login" ? "text-[#D28A4C]" : "text-[#F5F1EB]"}
            >
              Entrar
            </button>

            {/* Separador coral conforme o Figma. */}
            <span className="text-[#F0805F]">|</span>

            <button
              type="button"
              onClick={() => changeMode("register")}
              aria-pressed={mode === "register"}
              className={
                mode === "register" ? "text-[#D28A4C]" : "text-[#F5F1EB]"
              }
            >
              Criar conta
            </button>
          </div>

          {/* Descrição específica de cada modalidade. */}
          <p className="mb-6 mt-10 text-center text-[12px] leading-[16px] text-[#F5F1EB]">
            {mode === "login"
              ? "Entre para gerenciar sua carteira, coleção e perfil de criador."
              : "Crie seu perfil de colecionador e conecte uma carteira quando quiser."}
          </p>

          {/* Formulário de autenticação. */}
          <FormWithFeedback key={mode} onSubmit={handleSubmit} className="w-full">
            <div className="flex flex-col gap-3">
              {/* Nome de usuário: exclusivo do Cadastro. */}
              {mode === "register" && (
                <input
                  type="text"
                  required
                  aria-label="Nome de usuário" name="username" aria-invalid={!!auth.fieldErrors.username} aria-describedby={message ? "auth-feedback" : undefined}
                  placeholder="Nome de usuário"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="h-[40px] w-full rounded-[5px] border border-[#3F2319] bg-transparent px-4 text-[14px] outline-none placeholder:text-[#B39463] focus:border-[#D28A4C]"
                />
              )}

              {/* Campo de e-mail. */}
              <input
                type="email"
                required
                aria-label="E-mail" name="email" aria-invalid={!!auth.fieldErrors.email} aria-describedby={message ? "auth-feedback" : undefined}
                placeholder={
                  mode === "login" ? "contato@email.com" : "Digite seu e-mail"
                }
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-[40px] w-full rounded-[5px] border border-[#3F2319] bg-transparent px-4 text-[14px] outline-none placeholder:text-[#B39463] focus:border-[#D28A4C]"
              />

              {/* Campo de senha. */}
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  aria-label="Senha" name="password" aria-invalid={!!auth.fieldErrors.password} aria-describedby={message ? "auth-feedback" : undefined}
                  // Login: asteriscos ilustrativos.
                  // Cadastro: placeholder convencional.
                  placeholder={mode === "login" ? "************" : "Senha"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className={`h-[40px] w-full rounded-[5px] border border-[#D28A4C] bg-transparent px-4 pr-12 text-[16px] leading-[16px] text-[#F5F1EB] outline-none ${
                    mode === "login"
                      ? "placeholder:text-[#F5F1EB]"
                      : "placeholder:text-[#B39463]"
                  }`}
                />

                {/* Mostra ou oculta a senha digitada. */}
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#B39463]"
                >
                  {showPassword ? <Eye size={17} /> : <EyeOff size={17} />}
                </button>
              </div>

              {/* Confirmação de senha: exclusiva do Cadastro. */}
              {mode === "register" && (
                <input
                  type="password"
                  required
                  aria-label="Confirmar senha" name="confirmPassword" aria-invalid={!!auth.fieldErrors.confirmPassword} aria-describedby={message ? "auth-feedback" : undefined}
                  placeholder="Confirmar senha"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="h-[40px] w-full rounded-[5px] border border-[#3F2319] bg-transparent px-4 text-[14px] outline-none placeholder:text-[#B39463] focus:border-[#D28A4C]"
                />
              )}
            </div>

            {/* Recuperação de senha: exclusiva do Login. */}
            {mode === "login" && (
              <button
                type="button"
                onClick={() =>
                  setMessage("Recuperação de senha ainda não disponível.")
                }
                className="mt-2 block w-full text-right text-[12px] text-[#D28A4C]"
              >
                Esqueceu a senha?
              </button>
            )}

            {/* Botão principal. */}
            <button
              type="submit" disabled={auth.isSubmitting} aria-busy={auth.isSubmitting}
              className="mt-6 h-[45px] w-full rounded-[5px] bg-[#D28A4C] text-[14px] font-bold text-[#140D0A] hover:bg-[#E89B55]"
            >
              {auth.isSubmitting ? "Aguarde…" : mode === "login" ? "Entrar" : "Criar conta"}
            </button>

            {/* Mensagem de validação. */}
            {message && (
              <p
                id="auth-feedback"
                role="alert"
                className="mt-3 text-center text-[11px] leading-4 text-[#E89B55]"
              >
                {[...new Set([message, ...Object.values(auth.fieldErrors)])].join(" ")}
              </p>
            )}
          </FormWithFeedback>
        </div>

        {/* Separador e botões de autenticação social. */}
        <div className="mt-6 w-full px-[80px]">
          <div className="mb-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-[#3F2319]" />

            <span className="whitespace-nowrap text-[11px] text-[#F5F1EB]">
              Ou continue com
            </span>

            <div className="h-px flex-1 bg-[#3F2319]" />
          </div>

          {/* Botões sociais com os SVGs originais do Figma. */}
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() =>
                setMessage("Login com Google ainda não disponível.")
              }
              className="flex h-[40px] w-full items-center justify-center gap-3 rounded-[5px] border border-[#3F2319] text-[12px] text-[#F5F1EB]"
            >
              <img
                src="/icons/auth/Google1.svg"
                alt=""
                aria-hidden="true"
                className="h-5 w-5 object-contain"
              />
              Continuar com Google
            </button>

            <button
              type="button"
              onClick={() =>
                setMessage("Login com Facebook ainda não disponível.")
              }
              className="flex h-[40px] w-full items-center justify-center gap-3 rounded-[5px] border border-[#3F2319] text-[12px] text-[#F5F1EB]"
            >
              <img
                src="/icons/auth/Facebook1.svg"
                alt=""
                aria-hidden="true"
                className="h-5 w-5 object-contain"
              />
              Continuar com Facebook
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}


