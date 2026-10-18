# Validação local antes da publicação

## Última execução completa — revisão dos comentários

As fontes finais, incluindo a correção do Vite e o link Mercado, foram levadas
à cópia de verificação instalada pelo lockfile. TypeScript/build, lint e os
30 testes de regras passaram. A suíte completa terminou com **48 E2E aprovados,
zero falhas e zero testes instáveis**, em 5,0 minutos, sem atualizar baselines.
Três entradas são puladas por projeto: zoom desktop não se repete em tablet/mobile,
e o Header desktop não aparece no mobile. Os fluxos mobile continuam cobertos.

A revisão dos comentários conferiu 108 arquivos, complementou 68 e não alterou
a estrutura da lógica. Detalhes em [REVISAO-COMENTARIOS.md](./REVISAO-COMENTARIOS.md).
O relatório completo mais recente substitui a execução anterior em
`artifacts/playwright-report/index.html`.

O Lighthouse foi repetido sobre o build atual após as correções e comentários:
12 execuções completas, com desempenho mediano de 92/95 em desktop e 99/100
em mobile (Início/Detalhe). Acessibilidade, boas práticas e SEO tiveram mediana
100 nas quatro combinações. Todas as metas foram atingidas. Métricas, versões
e hashes do build estão em [PERFORMANCE.md](./PERFORMANCE.md) e nos relatórios.
Publicação e conferência da URL pública
permanecem pendentes e serão realizadas manualmente pelo candidato.

## Correção posterior da inicialização no Vite

Após a revisão da cópia limpa, foi identificado que o fallback `*/api/*` do MSW
também capturava importações `/src/api/*.ts` no desenvolvimento, devolvendo 501.
O build agrupado não usa esses caminhos. O fallback agora exige `/api/` na raiz
da origem. Um teste de regressão verifica que o módulo JavaScript passa e o
endpoint desconhecido continua recebendo 501. O total de testes de regras passou
a 30, todos aprovados; TypeScript/build e lint também passaram após a correção.
`E2E_SERVER=dev` permite repetir os fluxos no Vite. A falha de bootstrap agora
registra a causa original no console e não atribui qualquer erro a Service Workers.

Catálogo, detalhe/404/recuperação e compra/recibo passaram no Vite em desktop,
tablet e mobile (nove verificações, sem atualizar baselines). O link Mercado
do Header agora abre `/#catalogo` e acompanha a seção ativa; navegação por
teclado passou no desktop e tablet. A validação da URL admite `?page=1`, que
o catálogo normaliza ao carregar. A captura está em `artifacts/header-mercado.png`.

Os resultados da revisão anterior, abaixo, documentam aquele estado da entrega.

Em 18/10/2026, o build de produção de uma cópia limpa passou pelas verificações abaixo:

- TypeScript e build: `npm run build`.
- Análise estática: `npm run lint`.
- Regras e contratos: `npm test`, 29 testes aprovados.
- Navegação e regressão: `npm run test:e2e`, 46 testes aprovados em 4,9 minutos,
  sem atualização de snapshots nessa execução final.
- Duas entradas de zoom (tablet/mobile) são puladas intencionalmente: zoom de
  navegador desktop roda uma vez. O reflow e o movimento reduzido rodam nas três larguras.
- Chromium em desktop 1440 px, tablet 768 px e mobile 390 px.
- Lighthouse: 12 execuções; medianas e ambiente em [PERFORMANCE.md](./PERFORMANCE.md).

As quatro referências de detalhe desktop/tablet foram revisadas e atualizadas
antes da execução final, pois a descrição passou a usar o recurso consultado e
os títulos de contrato/direitos autorais foram corrigidos. As demais referências
permaneceram válidas. O relatório navegável fica em
`artifacts/playwright-report/index.html` e as imagens de referência em
`e2e/kurio.spec.ts-snapshots`.

Os testes cobrem filtros e URL, compra/recibo, carregamento/404/erro, cadastro e
foco, favoritos e isolamento de conta, carrinho/cupom, perfil/avatar/senha,
pedido pendente, expiração da sessão, resposta perdida, eventos fora de ordem,
recusa e estoque esgotado. A revisão adicional cobre edição das duas carteiras,
erro remoto associado ao endereço e foco, eventos duplicados sem nova
reconciliação, alteração de preço via socket no checkout e rejeição da cotação
vencida, seguida de confirmação somente com novo gesto do usuário.

Zoom real de 200% passou no Edge 155.0.4283.62 em perfil descartável, incluindo
formulários, compra e recibo. O Chromium completo deste Windows apresenta erro
SideBySide; a alternativa fica registrada no relatório. Os demais testes usam
Chromium. Movimento reduzido ativo desativa o shimmer; sete rotas não
apresentaram overflow horizontal nas larguras avaliadas. Capturas e medidas
de zoom estão anexadas ao relatório HTML.

Um reteste adicional do zoom também passou após fortalecer a verificação dos
limites do diálogo e da ausência de overflow interno. A captura padrão do
Playwright recortava a superfície ao usar zoom nativo; a evidência adicional
usa a captura completa do navegador, sem alterar CSS ou zoom da aplicação.
Ela está em `artifacts/zoom-200-receipt.png`. O relatório da suíte completa foi
preservado; esse reteste executou somente o caso de zoom.

`npm ci --no-fund` instalou 427 pacotes, reportando zero vulnerabilidades.
Não havia dependências instaladas, build ou `.env` na pasta nova. A comparação
SHA-256 confirmou 183 arquivos idênticos de fontes/assets/scripts/testes e
configuração. Veja [EXECUCAO-LIMPA.md](./EXECUCAO-LIMPA.md) para o procedimento.

A publicação na Vercel e a conferência das rotas públicas ainda estão pendentes.
O resultado automatizado não certifica acessibilidade: leitor de tela ainda
não foi avaliado manualmente. As verificações de zoom e movimento reduzido
descritas acima foram executadas, sem substituir uma avaliação assistiva completa.
As transações e carteiras são simuladas, sem movimentação de fundos.
