import type { KeyboardEvent } from "react";

/** Fecha o ciclo de Tab entre os controles visíveis, inclusive quando só há um botão habilitado. */
export function trapDialogTab(event: KeyboardEvent<HTMLElement>, container: HTMLElement) {
  if (event.key !== "Tab") return;
  // controls reúne elementos visíveis, habilitados e alcançáveis por Tab dentro do diálogo.
  const controls = Array.from(container.querySelectorAll<HTMLElement>('a[href],button,input,select,textarea,[tabindex]')).filter(control => control.tabIndex >= 0 && !control.matches(":disabled") && control.getClientRects().length > 0 && getComputedStyle(control).visibility !== "hidden");
  // first e last delimitam o ciclo de foco, mantendo Tab e Shift+Tab dentro da camada.
  const first = controls[0], last = controls[controls.length - 1];
  if (!first || !last) { event.preventDefault(); container.focus(); return; }
  // active identifica o elemento com foco para decidir se a navegação precisa retornar à outra extremidade.
  const active = document.activeElement;
  if (event.shiftKey && (active === first || active === container || !container.contains(active))) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && (active === last || active === container || !container.contains(active))) { event.preventDefault(); first.focus(); }
}
