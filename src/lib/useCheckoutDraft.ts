import { useState } from "react";
import { useAuth } from "@/contexts/auth-store";

/** Rascunho por usuário e aba: permite retomar o checkout após a sessão expirar. */
export function useCheckoutDraft(section: string) {
  // user contém a conta autenticada; os demais dados desta desestruturação informam a recuperação da sessão quando presentes.
  const { user } = useAuth();
  // key inclui usuário e seção para separar rascunhos de pagamento da mesma aba.
  const key = `kurio-checkout:${user!.id}:${section}`;
  // draft guarda os campos restaurados do pagamento; setDraft mantém o estado React sincronizado.
  const [draft, setDraft] = useState<Record<string, string>>(() => {
    try {
      // saved representa os dados recuperados do armazenamento, que precisam de validação antes do uso.
      const saved = JSON.parse(sessionStorage.getItem(key) ?? "{}");
      return saved && typeof saved === "object" && !Array.isArray(saved)
        ? Object.fromEntries(Object.entries(saved).filter((entry): entry is [string, string] => typeof entry[1] === "string")) : {};
    } catch { return {}; }
  });
  // updateDraft recebe field e value para atualizar um campo do rascunho e persistir a alteração da conta atual.
  function updateDraft(field: string, value: string) {
    // next reúne o rascunho atual e o campo recém-alterado antes da persistência.
    const next = { ...draft, [field]: value };
    setDraft(next);
    try { sessionStorage.setItem(key, JSON.stringify(next)); } catch { /* O formulário segue utilizável se o armazenamento da aba estiver bloqueado. */ }
  }
  return { draft, updateDraft };
}
