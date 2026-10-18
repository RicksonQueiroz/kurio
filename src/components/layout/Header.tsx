import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";

/**
 * Propriedades do cabeçalho desktop.
 *
 * cartCount: quantidade de itens no carrinho.
 * onLoginClick: função executada ao clicar em Entrar.
 */
type HeaderProps = {
  cartCount?: number;
  onLoginClick?: () => void;
  accountLabel?: string;
  accountLoading?: boolean;
};

/**
 * Cabeçalho desktop da Kurio.
 *
 * Mantém as dimensões e cores do Figma.
 */
export function Header({ cartCount = 0, onLoginClick, accountLabel = "Entrar", accountLoading = false }: HeaderProps) {
  // navigate permite abrir o catálogo e direcionar o foco à busca sem recarregar a aplicação.
  const navigate = useNavigate();
  // Identifica a rota atual para destacar a navegação.
  const location = useRouterState({
    select: (state) => state.location,
  });
  // pathname é somente o caminho da rota; location.hash identifica a seção Mercado dentro da Home.
  const pathname = location.pathname;

  // isHomeActive controla o destaque do link Início quando a Home está aberta.
  const isHomeActive = pathname === "/" && location.hash !== "catalogo";

  // isMarketActive agrupa as rotas de descoberta e compra que recebem o destaque Mercado.
  const isMarketActive =
    (pathname === "/" && location.hash === "catalogo") ||
    pathname === "/mercado" ||
    pathname.startsWith("/mercado/") ||
    pathname === "/cart" ||
    pathname === "/payment" ||
    pathname.startsWith("/nft/");

  // Estilos compartilhados pelos itens do menu.
  const navItemClass = "flex h-full items-center border-b-2 text-[16px]";

  // activeClass define as classes do item correspondente à seção atual.
  const activeClass = "border-[#E89B55] font-bold text-[#E89B55]";

  // inactiveClass define a aparência dos itens que não estão selecionados.
  const inactiveClass = "border-transparent text-[#F5F1EB]";

  return (
    <header className="mx-auto hidden w-full max-w-[1200px] md:block">
      {/* Linha principal do cabeçalho. */}
      <div className="flex h-[45px] items-center justify-between">
        {/* Logotipo. */}
        <Link
          to="/"
          className="text-[14px] font-bold tracking-[0.1em] text-[#F5F1EB]"
        >
          KURIO
        </Link>

        {/* Navegação principal. */}
        <nav
          aria-label="Navegação principal"
          className="flex h-full items-center gap-10"
        >
          <Link
            to="/"
            aria-current={isHomeActive ? "page" : undefined}
            className={`${navItemClass} ${
              isHomeActive ? activeClass : inactiveClass
            }`}
          >
            Início
          </Link>

          {/* Abre o catálogo da Home a partir de qualquer página, preservando o estilo do menu. */}
          <Link
            to="/"
            hash="catalogo"
            aria-current={isMarketActive ? "page" : undefined}
            className={`${navItemClass} ${
              isMarketActive ? activeClass : inactiveClass
            }`}
          >
            Mercado
          </Link>

          <span className="text-[16px] text-[#F5F1EB]">Criadores</span>

          <span className="text-[16px] text-[#F5F1EB]">Aprenda</span>
        </nav>

        {/* Ações do cabeçalho. */}
        <div className="flex items-center gap-8">
          {/* Leva ao campo real do catálogo, inclusive partindo de outras páginas. */}
          <button
            type="button"
            aria-label="Pesquisar NFTs"
            onClick={async () => { await navigate({ to: "/", hash: "catalogo" }); document.getElementById("catalog-search")?.focus(); }}
            className="flex cursor-pointer items-center justify-center"
          >
            <Search size={20} color="#F5F1EB" aria-hidden="true" />
          </button>

          {/* Carrinho: agora navega para /cart. */}
          <Link
            to="/cart"
            aria-label={`Abrir carrinho com ${cartCount} itens`}
            className="relative flex h-6 w-6 items-center justify-center"
          >
            <img
              src="/icons/cart.png"
              alt=""
              aria-hidden="true"
              className="h-6 w-6 object-contain"
            />

            {cartCount > 0 && (
              <span className="absolute -right-2 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#D28A4C] text-[10px] text-[#140D0A]">
                {cartCount}
              </span>
            )}
          </Link>

          {/* Abre o modal de Login. */}
          <button
            type="button"
            onClick={onLoginClick}
            disabled={accountLoading}
            aria-busy={accountLoading}
            className="flex h-[35px] w-[100px] cursor-pointer items-center justify-center gap-1 rounded-[6px] bg-[#D28A4C] text-[16px] font-medium text-[#140D0A]"
          >
            <img
              src="/icons/login.png"
              alt=""
              aria-hidden="true"
              className="h-[18px] w-[18px] object-contain"
            />
            {accountLabel}
          </button>
        </div>
      </div>

      {/* Divisor inferior. */}
      <div className="h-[0.3px] w-full bg-[#D28A4C]" />
    </header>
  );
}
