import type { ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/contexts/auth-store";
import { apiErrorMessage } from "@/api/http";
import { sessionDidExpire } from "@/lib/session-store";
import { AuthModal } from "./AuthModal";

/** Mantém a URL e o contexto de compra enquanto solicita uma sessão válida. */
export function RequireAuth({ children }: { children: ReactNode }) {
  // auth reúne a identidade atual e as operações de entrada, cadastro e saída.
  const auth = useAuth();
  // navigate permite mudar de rota pelo TanStack Router sem recarregar a página.
  const navigate = useNavigate();
  if (auth.isLoading) return <main className="mx-auto max-w-[1200px] p-6" role="status">Recuperando sua sessão…</main>;
  if (auth.error) return <main className="mx-auto max-w-[1200px] p-6" role="alert">
    <p>{apiErrorMessage(auth.error)}</p>
    <button className="mt-4 rounded bg-[#D28A4C] px-4 py-2 text-[#140D0A]" onClick={auth.retry}>Tentar novamente</button>
  </main>;
  if (!auth.user) return <>
    {sessionDidExpire() && <p role="status" className="sr-only">Sua sessão expirou. Entre novamente para continuar.</p>}
    <AuthModal onClose={() => void navigate({ to: "/" })} onAuthenticated={() => { /* A sessão recuperada libera o destino atual. */ }} />
  </>;
  return <div key={auth.user.id}>{children}</div>;
}
