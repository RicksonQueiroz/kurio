/** Mensagens de validação em português, sem depender do idioma instalado no navegador. */
export function validationMessage(validity: Pick<ValidityState, "valueMissing" | "typeMismatch" | "tooShort" | "tooLong" | "patternMismatch" | "rangeUnderflow" | "rangeOverflow" | "customError">, nativeMessage: string): string {
  if (validity.customError) return nativeMessage;
  if (validity.valueMissing) return "Preencha este campo.";
  if (validity.typeMismatch) return "Informe um valor válido para este campo.";
  if (validity.tooShort) return "O valor informado é muito curto.";
  if (validity.tooLong) return "O valor informado é muito longo.";
  if (validity.patternMismatch) return "Use o formato solicitado para este campo.";
  if (validity.rangeUnderflow || validity.rangeOverflow) return "Informe um valor dentro do intervalo permitido.";
  return "Revise o valor informado.";
}

/** Regras entre campos usam o mesmo fluxo acessível da validação nativa do formulário. */
export function reportFieldError(form: HTMLFormElement, name: string, message: string) {
  // control localiza o campo pelo atributo name para definir sua mensagem e posicionar o foco.
  const control = form.elements.namedItem(name);
  if (control instanceof HTMLInputElement || control instanceof HTMLSelectElement || control instanceof HTMLTextAreaElement) {
    control.setCustomValidity(message);
    control.reportValidity();
    control.focus();
  }
}
