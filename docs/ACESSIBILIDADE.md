# Revisão de interface, responsividade e acessibilidade

Registro da revisão inicial de 18/10/2026, anterior à integração final e às otimizações. As contagens de testes e pendências abaixo se referem àquele momento; consulte README e docs/PERFORMANCE.md para os resultados posteriores. Este registro não representa certificação WCAG.

## Implementações

- Skeleton do detalhe de NFT com dimensões reservadas, estado de carregamento anunciado e shimmer compatível com a preferência por movimento reduzido. Catálogo e carrinho mantêm seus estados de carregamento.
- Foco visível global e link para pular ao conteúdo. Documento em português e títulos por rota.
- Login, cadastro, gaveta de filtros e confirmação limitam a navegação por Tab ao diálogo, bloqueiam o fundo com `inert`, fecham por Escape e devolvem o foco ao acionador.
- Formulários exibem erros em português, associam mensagens aos campos, indicam `aria-invalid` e focam o campo inválido. Inclui confirmação de senha, erros da API simulada e validações de perfil/carteira.
- Filtro de preço acessível no mobile, com aplicar e limpar. Os demais filtros ainda dependem da implementação funcional prevista no desafio.
- Ajustes de tablet no catálogo, detalhes, pagamento e formulários; login com rolagem interna e recibo com colunas adaptadas para telas estreitas.

## Validação realizada

As seis rotas (`/`, `/nft/042`, `/cart`, `/payment`, `/profile` e `/wallets`) foram verificadas em 390, 768 e 1440 px, além de 320 e 720 px para reflow: 30 combinações sem overflow horizontal da página, imagens sem atributo alternativo ou controles sem nome no estado observado. A inspeção usa DOM renderizado e não substitui uma auditoria completa de todas as combinações de conteúdo.

Login/cadastro, gaveta e prévia do recibo foram operados pelo teclado, incluindo Tab, Shift+Tab, Escape, retorno do foco e isolamento do fundo. Foram conferidos erros obrigatórios, senha divergente e conflito de cadastro. O recibo foi revisto em 320 px após ajustar cabeçalhos e colunas. O atalho de pular ao conteúdo focou `main-content` com contorno visível. O skeleton do detalhe foi observado usando `?mockScenario=slow`.

O contraste dos textos visíveis foi inspecionado nas seis rotas; o botão com gradiente do carrinho foi conferido separadamente. As cores de texto verificadas superam 4,5:1 nos fundos correspondentes. A borda ajustada dos campos alcança aproximadamente 3,72:1 no fundo marrom.

`npm run build` (inclui TypeScript), `npm run lint` e os 18 testes existentes passaram. O build ainda informa um chunk acima de 500 kB; otimização de carregamento permanece para a etapa de desempenho.

Evidências em `artifacts/a11y-responsive-matrix.json`, `a11y-auth-keyboard.json`, `a11y-receipt-keyboard.json`, `a11y-color-contrast.json` e capturas `a11y-*.png`. Os registros de reteste prevalecem sobre medidas anteriores ao ajuste.

## Ajustes em relação ao layout

Foram preservados imagens, fontes locais, cores principais e composição desktop. Nenhum asset foi substituído nesta revisão. Para acessibilidade, os campos receberam bordas mais claras, os controles receberam contorno de foco, o texto do botão com gradiente passou a escuro e a navegação ganhou um atalho visível somente ao foco. No tablet há empilhamento e redução de colunas; no mobile foi adicionada a gaveta de preço e o cabeçalho da tabela do recibo usa tamanho menor para evitar sobreposição.

## Limites e pendências

Atualização posterior à revisão inicial: `e2e/accessibility.spec.ts` verificou
movimento reduzido ativo em 390, 768 e 1440 px, com shimmer desativado e sem
overflow do documento nas sete rotas. O zoom real de 200% foi conferido com
`chrome.tabs.setZoom`/`getZoom` no Edge 155.0.4283.62 em perfil descartável,
incluindo navegação, formulários, compra, recibo e fechamento por Escape.
O Chromium completo deste Windows apresentou erro SideBySide ao iniciar;
a alternativa é registrada no relatório e não se aplica aos demais testes,
que usam Chromium. Capturas e medidas de zoom estão anexadas ao relatório
Playwright. Esses resultados encerram as pendências de zoom e movimento
reduzido listadas no registro inicial abaixo. Leitor de tela permanece sem
avaliação específica.

- Foram testadas larguras lógicas reduzidas; o zoom real do navegador a 200% ainda precisa de conferência manual. A tentativa de atalho no ambiente de teste não alterou o zoom.
- A regra `prefers-reduced-motion` foi inspecionada no CSS; falta validar com a preferência ativada no sistema/navegador.
- Leitor de tela e axe não foram executados nesta revisão. Playwright executável foi implementado depois deste registro; Lighthouse e resultados atuais ficam em `artifacts/lighthouse`.
- O bloco posterior integrou pedidos, conta e carteiras por API, filtros na URL e Socket.IO. O recibo só abre para um snapshot confirmado pela simulação; não transmite transação real ou transfere NFTs. Veja `ARCHITECTURE.md` e `docs/PEDIDOS.md` para o estado atual. A publicação ainda precisa ser validada no destino.
