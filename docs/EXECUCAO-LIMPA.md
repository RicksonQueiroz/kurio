# Execução em cópia limpa — 18/10/2026

Atualização final: a instalação pelo lockfile foi mantida, e as fontes foram
atualizadas com a correção da inicialização no Vite, o link Mercado e a revisão
dos comentários. Nessa cópia, build/TypeScript, lint, 30 testes de regras e
48 E2E passaram. O procedimento inicial de instalação está descrito abaixo;
os resultados mais recentes constam em VALIDACAO-FINAL.md.

Foi criada uma pasta nova em `artifacts/clean-check-20261018-121957`, copiando
fontes, assets, testes, scripts, configurações e lockfile. Não foram copiados
`node_modules`, `dist`, `.env`, `.env.local`, cache de build ou dados do navegador.
A pasta original foi preservada. O cache de download do npm é permitido;
a instalação não reutiliza o diretório de dependências do projeto original.

A comparação SHA-256 encontrou 183 arquivos de execução/testes/configuração
idênticos, sem divergências. O lockfile usado foi:

```text
7D8486217FF1F1CD0CD4882E9F9043CA8EF8AF794DB2E765D1A85D1325EBC912
```

Na pasta nova foram executados:

```sh
npm ci --no-fund
npm run build
npm run lint
npm test
npm run test:e2e
```

O build inclui a verificação TypeScript. O Playwright inicia o servidor estático
do build dessa cópia, em uma origem local, e usa contextos isolados e reset das
fixtures. Não há dependência de um backend privado. Os resultados finais estão
em [VALIDACAO-FINAL.md](./VALIDACAO-FINAL.md).

Ambiente: Node 24.12.0, Windows 11, Playwright 1.64.1 e Chromium 156.0.8078.4.
O teste adicional de zoom usou Edge 155.0.4283.62 em perfil temporário, pois
o Chromium completo não inicia neste Windows por erro SideBySide. Os demais
testes usam o Chromium padrão do Playwright. A configuração e a alternativa
estão em `e2e/accessibility.spec.ts` e são registradas no relatório.

Para reproduzir a partir do repositório entregue, faça um clone em uma pasta
nova e execute os mesmos comandos. Instale o Chromium, quando necessário,
com `npx playwright install chromium`, como indicado no README.

Esta revisão acrescentou testes e documentação, sem mudar o comportamento
ou o visual da aplicação. A publicação será feita manualmente pelo candidato.
