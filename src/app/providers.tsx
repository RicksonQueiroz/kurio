import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";

import { router } from "./router";
import { AuthProvider } from "@/contexts/AuthProvider";
import { useAuth } from "@/contexts/auth-store";
import { CartProvider } from "@/contexts/CartContext";

/** Remontar por identidade impede que estado de formulários/carrinho atravesse contas. */
function SessionContent({ children }: { children?: ReactNode }) {
  // user contém a conta autenticada; os demais dados desta desestruturação informam a recuperação da sessão quando presentes.
  const { user } = useAuth();
  return <CartProvider key={user?.id ?? "guest"}>
    {children ?? <RouterProvider router={router} />}
  </CartProvider>;
}

// AppProviders recebe children e monta os provedores de consultas, sessão, carrinho e roteamento na ordem necessária.
export function AppProviders({ children }: { children?: ReactNode }) {
  // queryClient mantém uma única instância do cache durante a montagem dos provedores.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider><SessionContent>{children}</SessionContent></AuthProvider>
    </QueryClientProvider>
  );
}
