import { setupWorker } from "msw/browser";
import { catalogHandlers } from "./catalog-handlers";
import { authHandlers } from "./auth-handlers";
import { cartHandlers } from "./cart-handlers";
import { orderHandlers } from "./order-handlers";
import { accountHandlers } from "./account-handlers";
import { socketHandlers } from "./socket-handlers";

// Os handlers de rede são os mesmos usados no servidor MSW dos testes.
// worker intercepta as requisições HTTP no navegador usando os mesmos handlers dos testes.
export const worker = setupWorker(...socketHandlers, ...authHandlers, ...cartHandlers, ...orderHandlers, ...accountHandlers, ...catalogHandlers);
