import { defineConfig } from "@playwright/test";

// Permite repetir a mesma suíte no Vite, incluindo suas importações de /src/api.
const devServer = process.env.E2E_SERVER === "dev";

/** Três larguras do contrato, usando MSW e Socket.IO reais na aplicação. */
export default defineConfig({
  testDir: "./e2e", fullyParallel: false, workers: 1, retries: 0, timeout: 45_000,
  reporter: [["list"], ["html", { outputFolder: "artifacts/playwright-report", open: "never" }]],
  outputDir: "artifacts/playwright-results",
  use: { baseURL: "http://127.0.0.1:5185", trace: "retain-on-failure", screenshot: "only-on-failure", locale: "pt-BR", timezoneId: "America/Sao_Paulo" },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
    { name: "tablet", use: { viewport: { width: 768, height: 1000 } } },
    { name: "mobile", use: { viewport: { width: 390, height: 900 }, isMobile: true, hasTouch: true } },
  ],
  webServer: {
    command: devServer ? "npm run dev -- --host 127.0.0.1 --port 5185 --strictPort" : "node scripts/test-server.mjs",
    url: `http://127.0.0.1:5185/${devServer ? "" : "health"}`,
    reuseExistingServer: !process.env.CI,
  },
});
