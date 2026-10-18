import {
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";

// Páginas da aplicação.
import { Home } from "../pages/Home";
import { RequireAuth } from "../components/auth/RequireAuth";

// O layout fica em um módulo próprio para permitir o Fast Refresh dos componentes.
import { RootLayout } from "./RootLayout";
import { catalogSearch } from "@/lib/catalogSearch";
import { NFTDetailsQuery, Cart, Payment, Profile, Wallets, Favorites } from "./LazyPages";

/**
 * Rota raiz.
 */
const rootRoute = createRootRoute({
  component: RootLayout,
  notFoundComponent: () => <main className="mx-auto max-w-[1200px] p-8"><h1 className="text-xl font-bold">Página não encontrada</h1><a href="/" className="mt-4 inline-block text-[#E89B55] underline">Voltar ao catálogo</a></main>,
  errorComponent: ({ reset }) => <main role="alert" className="mx-auto max-w-[1200px] p-8"><h1 className="text-xl font-bold">Não foi possível abrir esta página</h1><p className="mt-3">Confira a conexão e tente novamente.</p><button onClick={reset} className="mt-4 text-[#E89B55] underline">Tentar novamente</button></main>,
});

/**
 * Página inicial.
 *
 * URL: /
 */
const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  validateSearch: catalogSearch,
  component: Home,
});

/**
 * Detalhes de um NFT.
 *
 * URL: /nft/:id
 */
const nftDetailsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/nft/$id",

  component: function NFTDetailsRoute() {
    // Recupera o ID da URL.
    const { id } = nftDetailsRoute.useParams();

    return <NFTDetailsQuery id={id} />;
  },
});

/**
 * Carrinho.
 *
 * URL: /cart
 */
const cartRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/cart",
  component: Cart,
});

/**
 * Pagamento com seleção demonstrativa de carteira e total vindo do carrinho.
 * URL: /payment. A própria página trata o acesso direto sem itens.
 */
const paymentRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/payment",
  validateSearch: (search: Record<string, unknown>): { order?: string; mockScenario?: string } => ({
    order: typeof search.order === "string" ? search.order : undefined,
    mockScenario: typeof search.mockScenario === "string" ? search.mockScenario : undefined,
  }),
  component: () => <RequireAuth><Payment /></RequireAuth>,
});

/** A proteção acompanha a rota reconhecida pelo Router, inclusive em acesso direto. */
const profileRoute = createRoute({ getParentRoute: () => rootRoute, path: "/profile", component: () => <RequireAuth><Profile /></RequireAuth> });
// walletsRoute associa /wallets às carteiras da conta autenticada.
const walletsRoute = createRoute({ getParentRoute: () => rootRoute, path: "/wallets", component: () => <RequireAuth><Wallets /></RequireAuth> });
// favoritesRoute associa a lista de interesse à proteção da sessão, inclusive em acesso direto.
const favoritesRoute = createRoute({ getParentRoute: () => rootRoute, path: "/favorites", component: () => <RequireAuth><Favorites /></RequireAuth> });

// Registra as rotas existentes.
const routeTree = rootRoute.addChildren([
  homeRoute,
  nftDetailsRoute,
  cartRoute,
  paymentRoute,
  profileRoute,
  walletsRoute,
  favoritesRoute,
]);

// Instância do roteador.
export const router = createRouter({
  routeTree,
});

// Tipagem das rotas para o TanStack Router.
declare module "@tanstack/react-router" {
  // Register informa ao TanStack Router quais rotas existem para validar links e parâmetros em TypeScript.
  interface Register {
    router: typeof router;
  }
}


