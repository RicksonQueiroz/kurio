import { useEffect, type RefObject } from "react";

/** Retira o fundo da navegação e da árvore acessível enquanto um diálogo não nativo está aberto. */
export function useModalInert(ref: RefObject<HTMLElement | null>, enabled = true) {
  // Isola os elementos fora do diálogo durante sua abertura e restaura os estados inert na desmontagem.
  useEffect(() => {
    if (!enabled || !ref.current) return;
    // previous guarda o estado original de cada irmão, sem tornar inerte um ancestral do diálogo.
    const previous = new Map<HTMLElement, boolean>();
    // branch sobe da camada até o body, tornando inertes apenas os irmãos de cada ancestral.
    let branch: HTMLElement = ref.current;
    while (branch.parentElement && branch !== document.body) {
      // sibling representa cada irmão do ramo do diálogo; seu estado inert é guardado antes de bloquear a interação.
      for (const sibling of branch.parentElement.children) {
        if (sibling instanceof HTMLElement && sibling !== branch) {
          previous.set(sibling, sibling.inert);
          sibling.toggleAttribute("inert", true);
        }
      }
      branch = branch.parentElement;
    }
    return () => { previous.forEach((inert, element) => { element.toggleAttribute("inert", inert); }); };
  }, [ref, enabled]);
}
