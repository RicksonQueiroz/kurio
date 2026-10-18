# Kurio — marketplace de NFTs

Desafio Frontend Jungle Gaming em React/TypeScript. Descoberta, compra e conta usam dados fictícios por REST/MSW e protocolo Socket.IO. Não há blockchain, assinatura de carteira ou pagamento real.

## Executar

Node.js 22.18+ e npm; ambiente validado com Node 24.12.

```sh
npm ci
npm run dev
```

Abra o endereço do Vite. Mocks estão habilitados por padrão também no build; `.env.example` documenta as variáveis opcionais. Service Workers exigem localhost ou HTTPS.

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run preview
```

`npm start` serve o build na porta 4173 (ou `PORT`). A demonstração não precisa de servidor REST/Socket.IO externo: MSW e `@mswjs/socket.io-binding` interceptam os transportes no navegador.

## Contas fictícias e fluxo

| E-mail | Senha |
|---|---|
| `nova@example.com` | `Kurio123!` |
| `sage@example.com` | `Kurio123!` |

Também é possível criar conta. A sessão dura 30 minutos. Senhas ficam como hash PBKDF2 com salt; recursos privados são separados por usuário.

Explore o catálogo, combine filtros e abra um NFT. Escolha edição/quantidade e adicione ao carrinho. Visitantes mantêm os itens ao entrar. Cadastre uma carteira em `/wallets`, conecte-a no pagamento, revise valores e confirme. O desktop exige os campos do colecionador. Use somente dados fictícios; endereço Ethereum/Polygon deve conter `0x` + 40 caracteres hexadecimais.

O recibo só abre para um pedido confirmado pela API. `/payment?order=<id>` recupera o snapshot após refresh. Recusas preservam itens; confirmação subtrai só a quantidade comprada. ETH trafega como string decimal e é calculado em wei com `bigint`. `KURIO10` concede 10% de desconto; `EXPIRADO` testa vencimento de cupom.

## Cenários reproduzíveis

Use `?mockScenario=<nome>` na rota, ou o header `x-kurio-scenario` nos testes HTTP:

| Cenário | Resultado |
|---|---|
| `default`, `empty`, `slow` | Normal, catálogo vazio ou latência de 1,8 s |
| `error`, `offline`, `mutation-error` | HTTP 503, falha de conexão ou de escrita |
| `out-of-order` | Latência variável na busca |
| `session-expired` | Sessão inválida e retomada da autenticação |
| `price-changed`, `stock-exhausted`, `catalog-default` | Condições controladas da cotação |
| `wallet-rejected` | Conexão recusada |
| `order-declined`, `order-pending`, `order-timeout` | Pedido recusado, pendente por um minuto ou resposta inicial perdida |

Depois de `order-timeout`, use **Recuperar tentativa**, inclusive após refresh. Chave e corpo originais são preservados; o mesmo reenvio recupera o mesmo pedido.

No console da aplicação, ou no setup dos testes, dispare eventos reais pelo cliente Socket.IO:

```js
await fetch('/api/mock/events', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ scenario: 'price-changed' }),
})
```

Aceita `price-changed`, `stock-exhausted`, `duplicate`, `out-of-order`, `disconnect` e `reset`. O mock altera o recurso, emite o evento e a interface reconcilia pela API; não há simulação por setters da UI.

Reset completo das fixtures da origem atual:

```js
await fetch('/api/mock/reset', { method: 'POST' })
location.assign('/')
```

Remove dados fictícios criados, sessões, carrinhos, pedidos, perfil, carteiras, favoritos e rascunhos do Kurio, restaurando as contas iniciais.

## Playwright e regressão visual

```sh
npx playwright install chromium
npm run build
npm run test:e2e
```

A configuração serve o build e executa Chromium em 1440, 768 e 390 px, com contextos isolados. A suíte cobre descoberta/URL, detalhe/404, conta/sessão, favoritos/falha, carrinho/cupom, pedidos, timeout, recusa, perfil/avatar/senha, carteiras, teclado, skeletons e Socket.IO. Relatório HTML: `artifacts/playwright-report/index.html`. Traces de falha: `artifacts/playwright-results`.

Baselines em `e2e/kurio.spec.ts-snapshots`. Para alteração visual intencional: `npm run test:visual:update`, revisão das imagens e nova execução sem atualizar. As referências usam Chromium no Windows; diferenças entre sistemas precisam de revisão explícita.

Para conferir os mesmos fluxos no servidor de desenvolvimento, use `E2E_SERVER=dev` ao executar o Playwright (PowerShell: `$env:E2E_SERVER='dev'; npm run test:e2e`). Sem essa variável, a configuração testa o build. O fallback MSW captura somente `/api/` na raiz, preservando os módulos `/src/api/` servidos pelo Vite.

`e2e/accessibility.spec.ts` verifica reflow nas sete rotas, shimmer com movimento reduzido e zoom real de 200%, incluindo compra e recibo. O zoom roda uma vez, no projeto desktop, com extensão local sem permissões em um perfil descartável. Usa Chromium completo; se ele não iniciar no Windows, tenta o Edge instalado e registra essa alternativa no relatório. Os fluxos dos três projetos continuam usando o Chromium padrão do Playwright. `KURIO_ZOOM_CHANNEL` permite selecionar explicitamente o navegador compatível. A extensão não faz parte do build nem altera seu perfil pessoal.

## Lighthouse

Depois do build, em dois terminais:

```sh
npm start
npm run audit:lighthouse
```

Audita início/detalhe nos perfis desktop/mobile, três vezes por combinação, com mocks e assets completos. HTML/JSON, LCP/CLS/TBT, ambiente e medianas ficam em `artifacts/lighthouse`. Veja as [medições finais e condições de reprodução](./docs/PERFORMANCE.md).

## Publicação

O build é estático (`dist`). `vercel.json` configura build e fallback de SPA preservando assets e Service Worker. Use `npm run build`, saída `dist` e mocks habilitados. O binding MSW/Socket.IO dispensa serviços privados externos. Valide HTTPS, acesso direto e refresh nas rotas publicadas.

Repositório remoto e URL pública ainda precisam ser definidos/publicados; não há deploy confirmado neste registro.

## Organização e decisões

Veja o [registro de validação local antes do deploy](./docs/VALIDACAO-FINAL.md).
Ele inclui a instalação em [cópia limpa](./docs/EXECUCAO-LIMPA.md) e a nova execução com as fontes finais: build/TypeScript, lint, 30 testes de regras e 48 E2E aprovados. Três entradas são puladas por projeto: zoom desktop não é repetido no tablet/mobile, e o Header desktop não aparece no mobile. A [revisão dos comentários](./docs/REVISAO-COMENTARIOS.md) explica o escopo da documentação do código.

`src/api` contém contratos/transporte; `src/mocks`, fixtures/handlers/persistência/eventos; `src/contexts`, sessão/carrinho/filtros; `src/pages` e `src/components`, interface; `tests`, contratos/regras; `e2e`, testes e baselines.

[ARCHITECTURE.md](./ARCHITECTURE.md) documenta cache, sessão, idempotência, eventos, assets, acessibilidade e desvios de UX/Figma. Contratos detalhados: [pedidos](./docs/PEDIDOS.md), [conta](./docs/CONTA.md), [catálogo](./docs/CATALOGO.md), [carrinho](./docs/CARRINHO.md) e [autenticação](./docs/AUTENTICACAO.md). Registros históricos não substituem os relatórios atuais.
