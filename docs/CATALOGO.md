# Descoberta por URL e REST

Busca (`q`), coleção (`collection`), rede (`network`), preço máximo decimal (`maxPrice`), ordenação (`sort`) e página (`page`) pertencem ao estado de busca do TanStack Router na Home. Refresh, acesso direto e voltar/avançar restauram os controles e a consulta. Alterar busca/filtro/ordenação reinicia a página em 1; os botões de paginação alteram somente a página. Filtros são combináveis.

O TanStack Query inclui os parâmetros na chave e o Axios recebe o sinal de cancelamento. Cada resposta fica associada à sua consulta; uma resposta antiga não substitui os resultados de outra busca. Os handlers MSW filtram, ordenam e paginam o catálogo. A interface não refaz essas regras e não usa contagens fictícias: `CatalogResponse.facets` contém contagens globais por coleção/rede das fixtures.

No desktop os filtros ficam na barra lateral e a busca no início do catálogo. O ícone de busca do Header posiciona o foco nesse campo. No mobile a busca usa o campo do cabeçalho e a gaveta reúne coleção, rede e preço. A inclusão de busca desktop, ordenação e paginação adapta o padrão visual para os comportamentos obrigatórios ausentes no frame implementado anteriormente.

Validação de navegador: página 2, busca Golden reiniciando página, ordenação crescente, refresh, filtro de rede e retorno pelo histórico. Em 390 px, combinação Arte digital + Ethereum + preço retornou quatro resultados coerentes e não apresentou overflow horizontal. O resultado vazio e a limpeza de filtros também foram conferidos. Durante atualizações dos módulos MSW em desenvolvimento, uma requisição falhou; após reinicializar a página, a consulta e sua repetição pelas ações da UI passaram.

`tests/catalog-search.test.ts` cobre normalização de URL e precisão decimal. Os testes HTTP de catálogo existentes cobrem filtros/ordenação, paginação, resultados vazios, erro e cancelamento. Evidência visual: `artifacts/catalog-url-mobile.png`.
