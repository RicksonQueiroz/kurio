import { useId, useState, type ComponentPropsWithoutRef } from "react";
import { validationMessage } from "@/lib/formValidation";

// FieldError guarda o rótulo e a mensagem que serão associados a um controle inválido.
type FieldError = { label: string; message: string };

/** Associa erros nativos a cada controle e posiciona o foco sem alterar a aparência dos campos. */
export function FormWithFeedback({ children, onInvalidCapture, onInputCapture, ...props }: ComponentPropsWithoutRef<"form">) {
  // prefix distingue formulários simultâneos, como as carteiras principal e secundária.
  const prefix = useId();
  // errors indexa os erros por identificador acessível; setErrors atualiza o resumo sem apagar outros campos.
  const [errors, setErrors] = useState<Record<string, FieldError>>({});
  return <form {...props} onInvalidCapture={event => {
    onInvalidCapture?.(event);
    event.preventDefault();
    // control é o campo que disparou a validação nativa do formulário.
    const control = event.target;
    if (!(control instanceof HTMLInputElement || control instanceof HTMLSelectElement || control instanceof HTMLTextAreaElement) || !control.form) return;
    // index identifica a posição do controle dentro do formulário, diferenciando campos sem id próprio.
    const index = Array.from(control.form.elements).indexOf(control);
    // errorId combina formulário e posição para vincular aria-describedby à mensagem correta.
    const errorId = `${prefix}-error-${index}`;
    // O rótulo do campo é anunciado junto à mensagem, inclusive quando há vários erros no envio.
    const linkedLabel = control.labels?.[0];
    // caption extrai o texto visual do rótulo e remove o asterisco decorativo de obrigatoriedade.
    const caption = linkedLabel?.querySelector("span")?.textContent?.replace(/\*/g, "").trim();
    // directText recupera rótulos cujo texto está diretamente no label, sem um elemento span.
    const directText = linkedLabel ? Array.from(linkedLabel.childNodes).filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent).join(" ").trim() : "";
    // label prioriza o nome acessível explícito e oferece alternativas para identificar o campo no erro.
    const label = control.getAttribute("aria-label") || caption || directText || control.name || "Campo";
    control.setAttribute("aria-invalid", "true");
    control.setAttribute("aria-describedby", [...new Set([...(control.getAttribute("aria-describedby")?.split(/\s+/) ?? []), errorId])].join(" "));
    setErrors(current => ({ ...current, [errorId]: { label: label.replace(/\*/g, "").trim(), message: validationMessage(control.validity, control.validationMessage) } }));
    // first encontra o primeiro controle inválido para que a correção comece pelo campo inicial.
    const first = control.form.querySelector<HTMLElement>('input:invalid, select:invalid, textarea:invalid');
    first?.focus();
  }} onInputCapture={event => {
    onInputCapture?.(event);
    // control identifica o campo editado, cujo erro pode ser limpo sem remover os demais.
    const control = event.target;
    if (!(control instanceof HTMLInputElement || control instanceof HTMLSelectElement || control instanceof HTMLTextAreaElement) || !control.form) return;
    // Alterar um campo limpa somente seu erro; descrições externas continuam associadas ao controle.
    const errorId = `${prefix}-error-${Array.from(control.form.elements).indexOf(control)}`;
    control.setCustomValidity("");
    if (!errors[errorId]) return;
    control.removeAttribute("aria-invalid");
    // remaining preserva descrições externas ao remover apenas a associação com o erro corrigido.
    const remaining = control.getAttribute("aria-describedby")?.split(/\s+/).filter(id => id !== errorId).join(" ");
    if (remaining) control.setAttribute("aria-describedby", remaining); else control.removeAttribute("aria-describedby");
    setErrors(current => Object.fromEntries(Object.entries(current).filter(([id]) => id !== errorId)));
  }}>
    {children}
    {!!Object.keys(errors).length && <div role="alert" className="mt-4 text-[12px] leading-5 text-[#E89B55]"><p>Revise os campos indicados:</p><ul className="list-inside list-disc">{Object.entries(errors).map(([id, error]) => <li id={id} key={id}>{error.label}: {error.message}</li>)}</ul></div>}
  </form>;
}
