# Desempenho — medição local final

Medição atualizada de 18/10/2026, concluída às 13h38 (America/Sao_Paulo), no
build de produção com as correções de inicialização, o link Mercado e os comentários
finais. Os mocks e as funcionalidades completos permaneceram habilitados.
Cada combinação foi executada três vezes; a tabela mostra a mediana de cada métrica.

| Página | Perfil | Desempenho | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Início | Desktop | 92 | 100 | 100 | 100 | 1093 ms | 0,00079 | 204 ms |
| Detalhe | Desktop | 95 | 100 | 100 | 100 | 1322 ms | 0,00009 | 133 ms |
| Início | Mobile | 99 | 100 | 100 | 100 | 1335 ms | 0,00149 | 98 ms |
| Detalhe | Mobile | 100 | 100 | 100 | 100 | 1317 ms | 0 | 41 ms |

As quatro combinações atingiram as metas do desafio nas medianas: desempenho
≥ 90, acessibilidade ≥ 95, boas práticas ≥ 95 e SEO ≥ 90. Nenhuma das 12
execuções apresentou erro de auditoria.

Ambiente: Windows 11 (10.0.26300), Ryzen 5 5500, Node 24.12.0,
Playwright 1.64.1, Chromium 156.0.8078.4, Vite 8.3.4 e Lighthouse 13.5.0.
Viewports: desktop 1440 × 1000 e mobile 390 × 900. O Lighthouse utiliza
throttling simulado padrão e preserva o armazenamento para o Service Worker.

Os 12 relatórios HTML/JSON estão em `artifacts/lighthouse`, com sufixos de execução
`-1`, `-2` e `-3`. `summary.json` contém todas as pontuações; `medians.json`
contém as medianas e o ambiente. `build-manifest.json` registra as versões e
os hashes SHA-256 dos arquivos medidos, incluindo o lockfile. Os relatórios
anteriores foram preservados separadamente e não compõem estas medianas.
Para reproduzir: `npm run build`, `npm start`
e, em outro terminal, `npm run audit:lighthouse`.

Pontuações de desempenho das três execuções: início desktop 91/92/96,
detalhe desktop 95/95/94, início mobile 99/99/99 e detalhe mobile 100/100/100.
As medianas não garantem o mesmo resultado em outra máquina ou após publicação.
Acessibilidade automatizada 100 não substitui avaliação com leitor de tela.
O zoom real e o movimento reduzido foram verificados separadamente no Playwright.

As principais otimizações foram converter os rasters embutidos dos SVGs do
Figma em WebP, manter os originais e carregar páginas por demanda. O mapeamento
dos assets está em `scripts/asset-mappings.json`; a transformação pode ser
reproduzida com `node scripts/optimize-assets.mjs`. As imagens de catálogo têm
dimensões reservadas e carregamento adiado. Nenhuma API, imagem ou autenticação
foi removida exclusivamente para melhorar a auditoria.

Os resultados públicos devem ser conferidos novamente depois do deploy.
