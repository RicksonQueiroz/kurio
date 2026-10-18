# Kurio — marketplace de NFTs

Desafio Frontend da Jungle Gaming em React e TypeScript. Catálogo, carrinho, compra e conta funcionam com API REST e eventos Socket.IO simulados pelo MSW. Não há pagamento ou conexão real com blockchain.

[Repositório](https://github.com/RicksonQueiroz/kurio) · Deploy: pendente de publicação.

## Executar

Use Node.js 24 e npm. Em uma cópia nova do repositório:

```sh
npm ci
npm run dev
```

Abra o endereço mostrado pelo Vite. O Service Worker exige `localhost` ou HTTPS; para acessar pelo celular, use a URL HTTPS publicada.

As opções estão em `.env.example`:

| Variável | Padrão e finalidade |
| --- | --- |
| `VITE_ENABLE_MOCKS` | Mocks ativos por padrão; mantenha `true` na demonstração |
| `VITE_API_URL` | `/api`; opcional para um backend REST compatível |
| `VITE_REALTIME_URL` | Mesma origem; opcional para um servidor Socket.IO compatível |

A demonstração não depende de backend externo. Configure `VITE_ENABLE_MOCKS=false` somente se fornecer os dois serviços compatíveis.

## Contas e fluxo de compra

| E-mail fictício | Senha |
| --- | --- |
| `nova@example.com` | `Kurio123!` |
| `sage@example.com` | `Kurio123!` |

Também é possível cadastrar uma conta. Escolha um NFT e edição, adicione ao carrinho e autentique-se. Cadastre uma carteira em `/wallets`, conecte-a no pagamento, revise os dados e confirme. Para Ethereum/Polygon, use um endereço fictício com `0x` e 40 caracteres hexadecimais. O recibo confirmado pode ser retomado por `/payment?order=<id>` após refresh.

Cupom `KURIO10`: desconto de 10%. `EXPIRADO` reproduz cupom vencido; outros códigos são inválidos.

## Cenários de avaliação

Use `?mockScenario=<nome>` na rota ou o header `x-kurio-scenario` nos testes HTTP:

| Cenário | Comportamento |
| --- | --- |
| `default`, `empty`, `slow` | Sucesso, catálogo vazio ou latência de 1,8 s |
| `error`, `offline`, `mutation-error` | HTTP 503, falha de conexão ou de escrita |
| `out-of-order` | Respostas de busca com latência variável |
| `session-expired` | Reautenticação preservando o destino; remova o parâmetro para entrar novamente |
| `price-changed`, `stock-exhausted`, `catalog-default` | Altera preço, esgota edição ou restaura a referência do catálogo |
| `wallet-rejected` | Recusa a conexão simulada |
| `order-declined`, `order-pending`, `order-timeout` | Pedido recusado, pendente por um minuto ou resposta perdida após criação |

Em `order-timeout`, use **Recuperar tentativa**, inclusive após refresh: a chave e o corpo originais recuperam o mesmo pedido. Falhas preservam os itens.

Para disparar alterações pelo Socket.IO, execute no console da aplicação:

```js
await fetch('/api/mock/events', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ scenario: 'price-changed' }),
})
```

O endpoint aceita `price-changed`, `stock-exhausted`, `duplicate`, `out-of-order`, `disconnect` e `reset`. Para restaurar integralmente as contas, catálogo, carrinhos, pedidos e rascunhos fictícios:

```js
await fetch('/api/mock/reset', { method: 'POST' })
location.assign('/')
```

## Verificações

| Comando | Finalidade |
| --- | --- |
| `npm run typecheck` | TypeScript |
| `npm run lint` | Análise estática |
| `npm test` | Regras e contratos HTTP |
| `npm run build` | TypeScript e build em `dist` |
| `npm run preview` | Prévia local do build |
| `npm start` | Servidor estático na porta 4173 ou `PORT` |
| `npm run test:e2e` | Playwright e regressão visual |
| `npm run audit:lighthouse` | Auditoria de início/detalhe em desktop/mobile |

Para os E2E, execute `npx playwright install chromium` e `npm run build` antes de `npm run test:e2e`. A suíte serve o build e usa contextos isolados em 390, 768 e 1440 px. Relatório: `artifacts/playwright-report/index.html`; traces de falhas: `artifacts/playwright-results`; baselines: `e2e/kurio.spec.ts-snapshots`. Atualizações intencionais usam `npm run test:visual:update`, revisão das imagens e nova execução sem atualizar.

O zoom usa um perfil temporário do Chromium completo, com alternativa registrada para Edge no Windows. `KURIO_ZOOM_CHANNEL` seleciona explicitamente o canal. Os demais fluxos usam Chromium. Para testar o Vite em vez do build, defina `E2E_SERVER=dev` (PowerShell: `$env:E2E_SERVER='dev'; npm run test:e2e`).

Validação local em 18/10/2026: TypeScript/build e lint aprovados, **30 testes de regras e 48 E2E aprovados**. Três entradas são puladas por viewport: zoom desktop não se repete no tablet/mobile, e o Header desktop não aparece no mobile.

## Lighthouse

Execute `npm run build`, mantenha `npm start` em um terminal e rode `npm run audit:lighthouse` em outro. São três medições por página e perfil, com mocks completos e throttling simulado padrão; o armazenamento é preservado para o Service Worker.

Medianas do build atual, medidas em 18/10/2026:

| Página/perfil | Performance | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Início desktop | 92 | 100 | 100 | 100 | 1093 ms | 0,00079 | 204 ms |
| Detalhe desktop | 95 | 100 | 100 | 100 | 1322 ms | 0,00009 | 133 ms |
| Início mobile | 99 | 100 | 100 | 100 | 1335 ms | 0,00149 | 98 ms |
| Detalhe mobile | 100 | 100 | 100 | 100 | 1317 ms | 0 | 41 ms |

As metas foram atingidas nas quatro combinações. HTML/JSON das 12 execuções, amostras, medianas e hashes do build estão em `artifacts/lighthouse`. Ambiente: Windows 11, Ryzen 5 5500, Node 24.12.0, Playwright 1.64.1, Chromium 156.0.8078.4, Vite 8.3.4 e Lighthouse 13.5.0. Viewports: 1440 × 1000 e 390 × 900. As pontuações podem variar em outra máquina ou após publicação.

## Deploy

Na Vercel, importe o repositório como **Vite**, use Node **24.x**, instalação `npm ci`, build `npm run build` e saída `dist`. Mantenha `VITE_ENABLE_MOCKS=true`. `vercel.json` contém o fallback de rotas e os headers do Service Worker.

Contratos REST/eventos, cache, sessão, decisões de UX e limitações estão em [ARCHITECTURE.md](./ARCHITECTURE.md), conforme exigido no enunciado.
