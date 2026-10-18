import { AccountLayout } from "./AccountLayout";
import { apiErrorMessage } from "@/api/http";

/** Mantém as dimensões do formulário durante consultas dos recursos privados. */
export function AccountQueryFeedback({ error, retry }: { error?: unknown; retry: () => void }) {
  return <AccountLayout>{error ? <div role="alert"><p>{apiErrorMessage(error)}</p><button onClick={retry} className="mt-4 text-[#E89B55] underline">Tentar novamente</button></div> : <div role="status" aria-label="Carregando dados da conta" className="grid grid-cols-2 gap-6">{Array.from({ length: 8 }, (_, i) => <div key={i} className="catalog-skeleton h-16 rounded" />)}</div>}</AccountLayout>;
}
