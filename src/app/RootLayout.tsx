import { Suspense, useEffect, useState } from "react";
import { Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/contexts/auth-store";

// Componentes compartilhados.
import { Header } from "../components/layout/Header";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileNav } from "@/components/layout/MobileNav";

// Modal de Login e Cadastro.
import { AuthModal } from "@/components/auth/AuthModal";

// Contexto do carrinho.
import { useCart } from "@/contexts/cart-store";
import { CatalogFilterContext } from "@/contexts/catalog-filter-store";
import { CatalogFiltersDrawer } from "@/components/home/CatalogFiltersDrawer";
import { catalogSearch } from "@/lib/catalogSearch";
import type { CatalogParams } from "@/api/contracts";
import { useRealtimeCatalog } from "@/lib/useRealtimeCatalog";

/**
 * Layout principal.
 *
 * Renderiza as páginas e controla o modal de autenticação.
 * Mantém o mesmo estado do modal durante a navegação entre as rotas filhas.
 * Fica separado da configuração do router para atender às regras de Fast Refresh.
 */
export function RootLayout() {
  // live reúne o estado da conexão e a mensagem anunciada quando chegam atualizações de catálogo ou pedido.
  const live = useRealtimeCatalog();
  // user contém a conta autenticada; os demais dados desta desestruturação informam a recuperação da sessão quando presentes.
  const { user, isLoading } = useAuth();
  // navigate permite mudar de rota pelo TanStack Router sem recarregar a página.
  const navigate = useNavigate();
  // Identifica a rota atual.
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  // O título identifica a página após navegação interna, inclusive para quem usa leitor de tela.
  useEffect(() => {
    // titles associa cada caminho conhecido ao nome utilizado no título da aba.
    const titles: Record<string, string> = { "/": "Início", "/cart": "Carrinho", "/payment": "Pagamento", "/profile": "Perfil do colecionador", "/wallets": "Carteiras" };
    document.title = `${titles[pathname] ?? (pathname.startsWith("/nft/") ? "Detalhes do NFT" : "Página não encontrada")} | Kurio`;
  }, [pathname]);

  // Obtém a quantidade de NFTs no carrinho.
  const { cartCount } = useCart();

  // Controla a abertura do modal.
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  // O preço aplicado e a abertura da gaveta são compartilhados com o catálogo, sem alterar seus dados.
  // A URL é a única fonte dos filtros aplicados; o histórico restaura a consulta.
  const search = useRouterState({ select: state => state.location.search });
  // params contém os filtros normalizados da URL, compartilhados com os controles e as consultas.
  const params = catalogSearch(search);
  // maxPrice adapta o preço decimal da URL para o slider; null indica ausência de limite aplicado.
  const maxPrice = params.maxPrice === undefined ? null : Number(params.maxPrice);
  // updateFilters combina patch com os filtros atuais; pageOnly preserva a página solicitada, enquanto um novo filtro volta à primeira.
  function updateFilters(patch: Partial<CatalogParams>, pageOnly = false) {
    void navigate({ to: "/", search: { ...params, ...patch, page: pageOnly ? patch.page : 1 }, hash: "catalogo" });
  }
  // setMaxPrice converte o valor do slider para o texto decimal enviado na URL; null remove esse filtro.
  const setMaxPrice = (value: number | null) => updateFilters({ maxPrice: value === null ? undefined : String(value) });
  // isFilterOpen controla a gaveta mobile; setIsFilterOpen abre ou fecha a camada sem perder os filtros aplicados.
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // O cabeçalho e a navegação mobile aparecem apenas na Home.
  const isHomePage = pathname === "/";
  // privatePage identifica telas privadas para evitar a sobreposição de dois diálogos de autenticação.
  const privatePage = ["/profile", "/wallets", "/payment", "/favorites"].includes(pathname.replace(/\/+$/, ""));
  // openAccount aguarda a sessão: usuários autenticados seguem ao perfil e visitantes recebem o diálogo de entrada.
  function openAccount() {
    if (isLoading) return;
    if (user) void navigate({ to: "/profile" });
    else setIsAuthOpen(true);
  }

  return (
    <CatalogFilterContext.Provider value={{ params, update: updateFilters, maxPrice, applyPrice: setMaxPrice }}>
      <a href="#main-content" className="skip-link">Pular para o conteúdo</a>
      <p role="status" className="sr-only">{live.message || (live.connected ? "Atualizações ao vivo conectadas." : "Atualizações ao vivo desconectadas. As consultas continuam disponíveis.")}</p>
      {/* Cabeçalho desktop em todas as páginas. */}
      {/* Pagamento e conta usam os 24px de respiro dos respectivos frames desktop. */}
      <div className={["/payment", "/profile", "/wallets"].includes(pathname) ? "md:pt-6" : undefined}>
        <Header cartCount={cartCount} onLoginClick={openAccount} accountLabel={user ? "Perfil" : "Entrar"} accountLoading={isLoading} />
      </div>

      {/* Cabeçalho mobile exclusivo da Home. */}
      {isHomePage && (
        <div className="px-6 pt-10 md:hidden">
          <MobileHeader onLoginClick={openAccount} onFiltersClick={() => setIsFilterOpen(true)} accountLabel={user ? "Perfil" : "Entrar"} accountLoading={isLoading} />
        </div>
      )}

      {/* O Outlet renderiza a rota filha ativa: Home, detalhes, carrinho ou pagamento.
          Os elementos compartilhados permanecem montados ao redor dessa página. */}
      <div id="main-content" tabIndex={-1}><Suspense fallback={<div role="status" className="catalog-skeleton mx-auto h-[600px] max-w-[1200px] rounded-xl"><span className="sr-only">Carregando página…</span></div>}><Outlet /></Suspense></div>

      {/* Navegação inferior mobile exclusiva da Home. */}
      {isHomePage && <MobileNav onLoginClick={openAccount} accountLoading={isLoading} />}
      {isHomePage && isFilterOpen && <CatalogFiltersDrawer initialPrice={maxPrice} onClose={() => setIsFilterOpen(false)} onApply={value => { setMaxPrice(value); setIsFilterOpen(false); }} />}

      {/* Modal exibido sobre o conteúdo quando aberto.
          Seleciona a apresentação adequada à largura da tela. */}
      {isAuthOpen && !privatePage && (
        <AuthModal onClose={() => setIsAuthOpen(false)} />
      )}
    </CatalogFilterContext.Provider>
  );
}

