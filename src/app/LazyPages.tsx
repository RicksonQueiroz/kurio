import { lazy } from "react";

/** Os fluxos secundários carregam código somente quando a rota é acessada. */
export const NFTDetailsQuery = lazy(() => import("../components/nft/NFTDetailsQuery").then(module => ({ default: module.NFTDetailsQuery })));
// Cart carrega o módulo do carrinho somente quando a rota precisa dele.
export const Cart = lazy(() => import("../pages/Cart").then(module => ({ default: module.Cart })));
// Payment adia o carregamento do checkout até sua abertura.
export const Payment = lazy(() => import("../pages/Payment").then(module => ({ default: module.Payment })));
// Profile carrega a edição do perfil sob demanda.
export const Profile = lazy(() => import("../pages/Profile").then(module => ({ default: module.Profile })));
// Wallets carrega o cadastro de carteiras sob demanda.
export const Wallets = lazy(() => import("../pages/Wallets").then(module => ({ default: module.Wallets })));
// Favorites carrega a lista privada de interesse sob demanda.
export const Favorites = lazy(() => import("../pages/Favorites").then(module => ({ default: module.Favorites })));
