import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import axios from "axios";
import { useAuth } from "@/contexts/auth-store";
import { apiErrorMessage } from "@/api/http";
import type { ApiErrorResponse } from "@/api/contracts";
import { sessionDidExpire } from "@/lib/session-store";
import { useCart } from "@/contexts/cart-store";

// AuthMode restringe o formulário aos modos de entrada e criação de conta.
export type AuthMode = "login" | "register";

// Compartilha campos, validações e envio da autenticação entre desktop e mobile.
export function useAuthForm(onClose: () => void, onAuthenticated = onClose) {
  // auth reúne a identidade atual e as operações de entrada, cadastro e saída.
  const auth = useAuth();
  // cart permite aguardar escritas do visitante antes de autenticar e mesclar seus itens.
  const cart = useCart();
  // fieldErrors associa campos aos erros devolvidos pela API; setFieldErrors atualiza essas associações.
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  // Define qual formulário está sendo exibido.
  const [mode, setMode] = useState<AuthMode>("login");

  // Valores dos campos.
  const [username, setUsername] = useState("");
  // email guarda o endereço informado; na API ele é normalizado para comparação de contas.
  const [email, setEmail] = useState("");
  // password mantém a senha apenas durante a validação ou derivação do hash; nunca é gravada em claro.
  const [password, setPassword] = useState("");
  // confirmPassword guarda a confirmação digitada, comparada à senha antes de enviar o cadastro.
  const [confirmPassword, setConfirmPassword] = useState("");

  // Controla a visibilidade da senha.
  const [showPassword, setShowPassword] = useState(false);

  // Mensagens de validação e funcionalidades pendentes.
  const [message, setMessage] = useState(() => sessionDidExpire() ? "Sua sessão expirou. Entre novamente para continuar." : "");

  // Permite fechar o modal com a tecla Escape.
  useEffect(() => {
    // handleKeyDown recebe o evento de teclado para fechar o formulário com Escape.
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  // Alterna entre Login e Cadastro.
  function changeMode(nextMode: AuthMode) {
    if (auth.isSubmitting || cart.isPending) return;
    setMode(nextMode);
    setMessage("");
    setFieldErrors({});
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
  }

  // A mutation resolve a sessão antes de fechar o modal e retomar a página atual.
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // form conserva a referência nativa durante o await; currentTarget do evento não é mantido após o envio.
    const form = event.currentTarget;
    if (auth.isSubmitting || cart.isPending || cart.isLoading) return;
    setMessage("");
    setFieldErrors({});

    if (mode === "register" && !username.trim()) {
      setMessage("Informe um nome de usuário.");
      setFieldErrors({ username: "Informe um nome de usuário." });
      // field localiza o nome de usuário para associar a validação ao controle e mover o foco.
      const field = form.elements.namedItem("username");
      if (field instanceof HTMLElement) field.focus();
      return;
    }

    if (!email.trim() || !password) {
      setMessage("Preencha os campos obrigatórios.");
      return;
    }

    if (mode === "register" && password !== confirmPassword) {
      setMessage("As senhas não coincidem.");
      setFieldErrors({ confirmPassword: "As senhas não coincidem." });
      // field localiza a confirmação de senha quando os dois valores não coincidem.
      const field = form.elements.namedItem("confirmPassword");
      if (field instanceof HTMLElement) field.focus();
      return;
    }

    try {
      if (mode === "register") await auth.register({ username: username.trim(), email: email.trim(), password });
      else await auth.login({ email: email.trim(), password });
      setPassword("");
      setConfirmPassword("");
      onAuthenticated();
    } catch (error) {
      setMessage(apiErrorMessage(error));
      if (axios.isAxiosError<ApiErrorResponse>(error)) {
        // fields associa nomes de controles às mensagens de validação retornadas pela API.
        const fields = error.response?.data.error.fields ?? {};
        setFieldErrors(fields);
        // field seleciona o primeiro controle rejeitado pela API, usando o e-mail como alternativa.
        const field = form.elements.namedItem(Object.keys(fields)[0] ?? "email");
        if (field instanceof HTMLElement) field.focus();
      }
    }
  }

  return { mode, username, setUsername, email, setEmail, password, setPassword, confirmPassword, setConfirmPassword, showPassword, setShowPassword, message, setMessage, fieldErrors, isSubmitting: auth.isSubmitting || cart.isPending || cart.isLoading, changeMode, handleSubmit };
}

// AuthForm deriva o tipo retornado pelo hook para os dois layouts consumirem o mesmo contrato.
export type AuthForm = ReturnType<typeof useAuthForm>;
