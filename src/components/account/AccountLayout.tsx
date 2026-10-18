import { useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { UserRound, MapPin, ShoppingCart, Heart, HandCoins, Download, TriangleAlert, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/auth-store";
import { apiErrorMessage } from "@/api/http";

// Itens ainda sem tela dão feedback; os dois destinos da etapa 7 são links reais.
const pendingItems = [
  { label: "Atividade", Icon: ShoppingCart },
  { label: "Ofertas", Icon: HandCoins },
  { label: "Arquivos baixados", Icon: Download },
  { label: "Suporte", Icon: TriangleAlert },
];

/** Layout dos dois frames de conta: sidebar de 310px, gap de 28px e conteúdo de 862px. */
export function AccountLayout({ children }: { children: ReactNode }) {
  // auth reúne a identidade atual e as operações de entrada, cadastro e saída.
  const auth = useAuth();
  // pathname contém o caminho da URL atual para adaptar a navegação e o layout.
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  // message guarda o feedback exibido ao usuário; o respectivo setter atualiza essa mensagem.
  const [message, setMessage] = useState("");
  // itemStyle reúne as classes comuns dos links e botões do menu da conta.
  const itemStyle = "flex min-h-[45px] w-full items-center gap-3 border-l-[5px] px-4 text-left text-[14px] text-[#B39463]";

  return (
    <main className="mx-auto grid min-h-[calc(1080px-69px)] w-full max-w-[1200px] grid-cols-[310px_minmax(0,1fr)] items-start gap-7 px-6 pb-6 pt-8 max-[1023px]:grid-cols-[240px_minmax(0,1fr)] max-[767px]:grid-cols-1 xl:px-0">
      {/* Menu compartilhado. O item ativo é identificado por cor e aria-current. */}
      <aside aria-label="Menu do perfil" className="bg-[#241612] py-2">
        <h2 className="px-3 py-3 text-[16px] font-bold leading-4">Meu perfil</h2>
        <nav aria-label="Minha conta">
          <Link to="/profile" aria-current={pathname === "/profile" ? "page" : undefined} className={`${itemStyle} ${pathname === "/profile" ? "border-[#D28A4C]" : "border-transparent"}`}><UserRound size={18} strokeWidth={1.3} aria-hidden="true" />Dados do perfil</Link>
          <Link to="/wallets" aria-current={pathname === "/wallets" ? "page" : undefined} className={`${itemStyle} ${pathname === "/wallets" ? "border-[#D28A4C]" : "border-transparent"}`}><MapPin size={18} strokeWidth={1.3} aria-hidden="true" />Carteiras</Link>
          <Link to="/favorites" aria-current={pathname === "/favorites" ? "page" : undefined} className={`${itemStyle} ${pathname === "/favorites" ? "border-[#D28A4C]" : "border-transparent"}`}><Heart size={18} strokeWidth={1.3} aria-hidden="true" />Lista de interesse</Link>
          {pendingItems.map(({ label, Icon }) => <button key={label} type="button" onClick={() => setMessage(`${label}: funcionalidade ainda não implementada.`)} className={`${itemStyle} border-transparent`}><Icon size={18} strokeWidth={1.3} aria-hidden="true" />{label}</button>)}
          <button type="button" disabled={auth.isSubmitting} onClick={() => { void auth.logout().catch(error => setMessage(apiErrorMessage(error))); }} className={`${itemStyle} border-l-transparent border-t border-t-[#61452F]`}><LogOut size={18} strokeWidth={1.3} aria-hidden="true" />{auth.isSubmitting ? "Saindo…" : "Sair"}</button>
        </nav>
        {message && <p role="status" className="px-4 pt-3 text-[12px] leading-5 text-[#CFB28C]">{message}</p>}
      </aside>
      {/* Cada página mantém seus próprios formulários; não há rodapé nesses frames. */}
      <div className="min-w-0">{children}</div>
    </main>
  );
}
