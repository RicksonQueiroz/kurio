import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  // Ativa a compilação de componentes React e a geração das classes Tailwind utilizadas nas telas.
  plugins: [react(), tailwindcss()],
  server: {
    watch: { ignored: ["**/artifacts/**", "**/e2e/**"] },
  },
  resolve: {
    alias: {
      // @ aponta para src, permitindo importar módulos sem cadeias de caminhos relativos.
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
