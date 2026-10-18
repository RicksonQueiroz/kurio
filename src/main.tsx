import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./index.css";

// Aguarda a interceptação da rede antes da primeira consulta, inclusive no build de demonstração.
async function bootstrap() {
  if (import.meta.env.VITE_ENABLE_MOCKS !== "false") {
    // worker é carregado antes do React para interceptar também a primeira consulta à API.
    const { worker } = await import("./mocks/browser");
    await worker.start({
      quiet: true,
      onUnhandledRequest: "bypass",
    });
  }
  // O socket.io-client só é importado depois de o MSW interceptar WebSocket.
  // Assim o transporte usa a conexão simulada, inclusive em acesso direto e refresh.
  const { default: App } = await import("./App.tsx");
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      {/* AppProviders organiza sessão, consultas, carrinho e rotas. */}
      <App />
    </StrictMode>,
  );
}

// Uma falha de inicialização não deve deixar uma página vazia ou usar dados locais silenciosamente.
void bootstrap().catch((error: unknown) => {
  // Mantém a causa original no console para diagnosticar importações e interceptação da rede.
  console.error("Não foi possível iniciar o Kurio:", error);
  // root localiza o elemento de montagem para apresentar uma falha de inicialização acessível.
  const root = document.getElementById("root");
  if (root) {
    root.textContent = "Não foi possível iniciar o Kurio. Recarregue a página e tente novamente.";
    root.setAttribute("role", "alert");
  }
});
