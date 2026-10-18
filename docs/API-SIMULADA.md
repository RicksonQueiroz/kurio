# Base da API simulada

O catálogo e os detalhes consultam Axios → MSW usando TanStack Query. O worker inicia antes do React, inclusive no build de demonstração. O visual das telas existentes foi preservado. Requer Node 24 para os testes TypeScript executados diretamente.

## Executar e verificar

```sh
npm install
npm run dev
npm run typecheck
npm run lint
npm test
npm run build
```

`.env.example` documenta as opções. Os mocks ficam ativos por padrão. Para usar um servidor real, configure `VITE_ENABLE_MOCKS=false` e `VITE_API_URL` com a URL da API.

## Contrato implementado

| Método e rota | Comportamento |
| --- | --- |
| GET /api/nfts | Lista paginada; q, collection, network, maxPrice, sort, page e pageSize |
| GET /api/nfts/:id | Detalhes ou erro 404 |
| POST /api/mock/reset | Restaura as fixtures determinísticas; resposta 204 |

O catálogo contém 32 itens. `sort` aceita recent, popular, price-asc e price-desc. `pageSize` aceita 1–50; página inicia em 1. Parâmetros inválidos retornam 422. Endpoints de API ainda não implementados retornam 501.

Preços em ETH são strings decimais com até 18 casas. Cálculos usam bigint em wei; arredondamento ocorre somente ao exibir. O carrinho antigo converte preços numéricos salvos para texto ao restaurar os dados.

## Cenários reproduzíveis

Abra a Home com `?mockScenario=empty`, `slow`, `error`, `offline` ou `out-of-order`. Nos testes, o header `x-kurio-scenario` seleciona o mesmo cenário. Remover o parâmetro e recarregar restaura o comportamento normal. O cenário fora de ordem aplica atraso maior a buscas curtas; as consultas consomem AbortSignal para permitir cancelamento de resultados obsoletos.

## Validação e limites deste bloco

Dezoito testes cobrem dinheiro, catálogo, autenticação, carrinho e cotação. São testes de unidade/integração, não substituem Playwright E2E. Veja os contratos e cenários em [AUTENTICACAO.md](./AUTENTICACAO.md) e [CARRINHO.md](./CARRINHO.md).

Busca, filtros combinados, ordenação e paginação usam URL e REST. Conta, carrinho/cotação, favoritos, perfil/carteiras e pedidos usam queries/mutations autenticadas. Eventos `nft.updated` e `order.updated` usam socket.io-client com o binding MSW/Socket.IO. Consulte [ARCHITECTURE.md](../ARCHITECTURE.md), [CONTA.md](./CONTA.md), [PEDIDOS.md](./PEDIDOS.md) e [CATALOGO.md](./CATALOGO.md) para os contratos atuais.
