# Pedidos simulados

## Contrato e estados

`POST /api/orders` exige sessão e cabeçalho `Idempotency-Key`. O corpo `OrderInput` informa `quoteId`, `quoteExpiresAt`, provedor, rede, carteira e os campos do colecionador quando enviados pelo formulário desktop. O servidor calcula valores a partir do carrinho e valida a cotação emitida pela API. Valores e vencimento não podem ser prorrogados ou definidos pelo cliente.

O retorno inicial é `202` com um `Order` pendente. `GET /api/orders/:id` consulta apenas pedidos da própria conta; recursos de outras contas retornam 404. Após o prazo simulado, a consulta materializa confirmação ou recusa. A transição revalida estoque e baixa somente a quantidade comprada, uma única vez. Itens adicionados posteriormente permanecem no carrinho. Recusas preservam a seleção.

O pedido persiste seu snapshot de itens, valores, dados enviados, estado e referência fictícia `SIM-…`. Alterações posteriores no catálogo não alteram o recibo. Não há blockchain ou pagamento real.

## Idempotência e recuperação

A chave fica associada à conta e ao conteúdo canônico do corpo. Reenvios idênticos devolvem o mesmo pedido; outro conteúdo com a mesma chave retorna 409. Dois envios concorrentes não duplicam a compra. Outra tentativa com um pedido pendente recupera seu identificador para consulta.

A interface grava um diário por usuário (`kurio-order-attempt:<id>`) antes de enviar. Falhas de rede mantêm chave e corpo originais; o botão **Recuperar tentativa** repete exatamente a chamada. A URL `/payment?order=<id>` permite recarregar e consultar o pedido. O diário só é apagado após registrar essa URL. Sessão expirada usa o fluxo existente de reautenticação e preserva URL/diário.

A query inclui usuário e identificador, cancela consulta obsoleta e consulta a cada segundo enquanto o estado é pendente. Queries e mutations não repetem automaticamente em caso de falha. Reconexão/foco permite reconciliação e existe ação explícita para consultar novamente. Na confirmação, o cache de carrinho e catálogo é invalidado. O modal abre somente para `confirmed`.

## Cenários reproduzíveis

Use `?mockScenario=…` na página de pagamento ou `x-kurio-scenario` nos testes:

| Cenário | Resultado |
|---|---|
| `default` | Confirma após aproximadamente 1,8 segundo |
| `order-declined` | Recusa e preserva carrinho |
| `order-pending` | Permanece pendente por aproximadamente um minuto |
| `order-timeout` | Grava pedido e perde a resposta inicial; reenvio recupera o mesmo recurso |
| `slow`, `offline`, `error`, `mutation-error` | Latência, perda de conexão ou HTTP 503 |

O reset compartilhado `/api/mock/reset` também limpa o banco de pedidos. A persistência dos recursos é de responsabilidade dos handlers MSW, não dos componentes.

## Verificação

`tests/orders.test.ts` cobre concorrência/idempotência, conteúdo conflitante, resposta perdida, snapshot imutável, quantidade incluída depois da compra, recusa, isolamento de conta, autenticação, cotação vencida/alterada e estoque insuficiente.

No navegador foram conferidos envio pelo formulário desktop, recibo após refresh, recibo mobile e recuperação de resposta perdida após recarga, preservando a mesma tentativa. Evidência: `artifacts/order-recovered-mobile.png`.

## Integrações obrigatórias ainda em andamento

Pedidos usam carteiras cadastradas e conexão simulada pela API; veja [CONTA.md](./CONTA.md). Busca e filtros na URL estão em [CATALOGO.md](./CATALOGO.md). `order.updated` é emitido pelos mocks via protocolo Socket.IO e provoca reconciliação REST. A consulta periódica continua como contingência. A suíte Playwright cobre timeout, desconexão, recusa e recuperação, além dos testes HTTP.
