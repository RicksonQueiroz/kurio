import type { ReactNode } from "react";

// accountInputStyle padroniza tamanho, borda e foco dos campos com texto claro.
// Os seletores têm uma constante própria para preservar o texto alaranjado do Figma.
export const accountInputStyle = "h-10 w-full min-w-0 rounded-[3px] border border-[#3F2319] bg-transparent px-3 text-[14px] text-[#F5F1EB] outline-none focus:border-[#D28A4C] placeholder:text-[#B39463]";
// accountSelectStyle mantém o formato dos campos, aplicando o texto alaranjado exigido aos seletores.
export const accountSelectStyle = "h-10 w-full min-w-0 rounded-[3px] border border-[#3F2319] bg-[#140D0A] px-3 text-[14px] text-[#B39463] outline-none focus:border-[#D28A4C]";

/** Rótulos de 29px e espaço de 10px reproduzem os campos de 79px do perfil. */
export function AccountField({ label, required = false, children }: { label: string; required?: boolean; children: ReactNode }) {
  // label nomeia o controle, required acrescenta a indicação visual e children recebe o input ou select nativo.
  return <label className="flex min-w-0 flex-col gap-[10px] text-[14px] leading-4"><span className="flex h-[29px] items-center">{label}{required && <span aria-hidden="true" className="ml-1 text-[22px] text-[#F0805F]">*</span>}</span>{children}</label>;
}
