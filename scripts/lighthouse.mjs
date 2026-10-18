import lighthouse from 'lighthouse';
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { platform, release, cpus } from 'node:os';

/** Audita o build servido por npm start; relatórios ficam locais, sem upload. */
const base = process.env.AUDIT_URL ?? 'http://127.0.0.1:4173';
// port reserva o endpoint de depuração usado pelo Lighthouse para acessar este Chromium.
const port = 9223;
// context mantém o perfil de auditoria e seu Service Worker durante as três medições de cada combinação.
const context = await chromium.launchPersistentContext('artifacts/lighthouse-profile', { headless: true, args: [`--remote-debugging-port=${port}`] });
try {
  // page prepara as fixtures pela interface e pela rede antes de começar as auditorias.
  const page = await context.newPage();
  await page.goto(base);
  await page.getByRole('heading', { level: 1 }).waitFor();
  // Fixtures pela própria rede MSW: não altera bancos internos nem usa dados reais.
  await page.evaluate(async () => {
    await fetch('/api/mock/reset', { method: 'POST' });
  });
  await page.close();
  await mkdir('artifacts/lighthouse', { recursive: true });
  // summary acumula as pontuações e métricas de todas as páginas, perfis e execuções.
  const summary = [];
  // mode identifica o perfil de emulação: desktop ou mobile.
  for (const mode of ['desktop', 'mobile']) {
    // name identifica os arquivos de relatório; route é o caminho da página auditada.
    for (const [name, route] of [['inicio', '/'], ['detalhe', '/nft/042']]) {
      // run numera as três medições independentes da mesma página e perfil.
      for (let run = 1; run <= 3; run++) {
      // result contém o relatório HTML, o JSON e as métricas desta execução do Lighthouse.
      const result = await lighthouse(base + route, {
        port, output: ['html', 'json'], logLevel: 'error', disableStorageReset: true,
        ...(mode === 'desktop' ? { formFactor: 'desktop', screenEmulation: { mobile: false, width: 1440, height: 1000, deviceScaleFactor: 1, disabled: false } } : { formFactor: 'mobile', screenEmulation: { mobile: true, width: 390, height: 900, deviceScaleFactor: 1, disabled: false } }),
      });
      await writeFile(`artifacts/lighthouse/${name}-${mode}-${run}.html`, result.report[0]);
      await writeFile(`artifacts/lighthouse/${name}-${mode}-${run}.json`, result.report[1]);
      // scores converte as pontuações das categorias de frações para a escala de zero a cem.
      const scores = Object.fromEntries(Object.entries(result.lhr.categories).map(([key, value]) => [key, value.score === null ? null : Math.round(value.score * 100)]));
      // metrics seleciona LCP, CLS e TBT em seus valores numéricos originais.
      const metrics = Object.fromEntries(['largest-contentful-paint', 'cumulative-layout-shift', 'total-blocking-time'].map(key => [key, result.lhr.audits[key].numericValue]));
      summary.push({ page: name, mode, run, url: result.lhr.finalDisplayedUrl, scores, metrics, lighthouseVersion: result.lhr.lighthouseVersion, runtimeError: result.lhr.runtimeError ?? null });
      console.log(name, mode, run, JSON.stringify(scores));
      }
    }
  }
  await writeFile('artifacts/lighthouse/summary.json', JSON.stringify(summary, null, 2));
  // median ordena as três amostras e devolve o valor central, sem calcular uma média.
  const median = values => [...values].sort((a, b) => a - b)[1];
  // medians acumula o resumo por página e perfil, preservando separadamente cada categoria e métrica.
  const medians = [];
  // mode e name selecionam a combinação cujas três amostras serão resumidas pela mediana.
  for (const mode of ['desktop', 'mobile']) /* name identifica a página dentro do perfil atual. */ for (const name of ['inicio', 'detalhe']) {
    // runs seleciona as três execuções da mesma página e perfil para calcular suas medianas.
    const runs = summary.filter(item => item.page === name && item.mode === mode);
    medians.push({ page: name, mode, scores: Object.fromEntries(Object.keys(runs[0].scores).map(key => [key, median(runs.map(run => run.scores[key]))])), metrics: Object.fromEntries(Object.keys(runs[0].metrics).map(key => [key, median(runs.map(run => run.metrics[key]))])) });
  }
  await writeFile('artifacts/lighthouse/medians.json', JSON.stringify({ environment: { node: process.version, platform: platform(), release: release(), cpu: cpus()[0]?.model, lighthouse: summary[0].lighthouseVersion, date: new Date().toISOString(), conditions: 'Build de produção, mocks padrão completos, Chrome headless, throttling simulado padrão do Lighthouse; armazenamento preservado para o Service Worker.' }, medians }, null, 2));
} finally { await context.close(); }
