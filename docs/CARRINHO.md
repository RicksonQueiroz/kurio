# Carrinho e cotação — 18/10/2026

Carrinho mobile, desktop e resumo do pagamento consomem a mesma query por identidade. Todas as operações passam por Axios/MSW. O componente não armazena preços ou regras de desconto como fonte autoritativa.

## Contratos

| Operação | Entrada | Resultado |
| --- | --- | --- |
| GET /api/cart | Bearer token ou x-kurio-guest | Carrinho e cotação atuais |
| POST /api/cart/items | nftId, edition, quantity | Adiciona à quantidade existente |
| PATCH /api/cart/items | nftId, edition, quantity | Substitui a quantidade |
| DELETE /api/cart/items/:nftId/:edition | Identificadores codificados na URL | Remove a edição correspondente |
| DELETE /api/cart | Identidade | Esvazia carrinho e cupom |
| POST /api/cart/coupon | code | Aplica cupom validado |
| DELETE /api/cart/coupon | Identidade | Remove o cupom |
| POST /api/quote | Identidade | Revalida e devolve carrinho/cotação |

Cada escrita retorna `CartResponse`: items, version, notices e quote. A cotação contém id, expiresAt, cartVersion, subtotal, discount, networkFee, total, coupon, valid e issues. Os valores monetários são strings decimais e usam bigint/wei nos cálculos. A apresentação conserva todos os decimais significativos; não arredonda um desconto de 0.119 para 0.12.

Preços enviados pelo cliente são ignorados. Quantidades devem ser inteiras positivas, edição válida e estoque suficiente. Erros de validação retornam 422; NFT inexistente, 404; conflito de estoque, 409. A quantidade zero é traduzida pela interface em remoção. Se o estoque cair abaixo de uma seleção antiga, o usuário pode reduzi-la gradualmente ou removê-la; a cotação continua inválida até regularização.

## Cupons de demonstração

- `KURIO10`: desconto de 10% no subtotal, com truncamento apenas abaixo de um wei.
- `EXPIRADO`: erro 410.
- Outros códigos: erro 422.

Exemplo: subtotal 1.19 ETH, desconto 0.119 ETH e taxa 0.016 ETH resultam em 1.087 ETH. A taxa é zero no carrinho vazio. Um cupom inválido/expirado não substitui o cupom válido anterior. Remover o último item também remove o cupom.

## Identidade e persistência

O visitante recebe um identificador opaco persistido, enviado em `x-kurio-guest`. Uma sessão válida tem prioridade. Token inválido retorna 401 e nunca dá acesso ao carrinho de outra identidade.

O banco do mock é salvo em `kurio-mock-carts-v1`, separado por visitante/usuário. Login e cadastro mesclam o visitante pela API uma vez, preservando itens e cupom sem copiar o carrinho de outra conta. As chaves dos carrinhos das prévias anteriores são migradas pela simulação, somente para a identidade correspondente. Reset recria o catálogo e esvazia o banco.

## Cache, falhas e disponibilidade

A query usa chave `['cart', identidade]`, AbortSignal, atualização ao foco e consulta periódica de contingência a cada 15 segundos. Eventos `nft.updated` e `order.updated` também invalidam os recursos afetados e conciliam seus valores com REST; veja [ARCHITECTURE.md](../ARCHITECTURE.md).

Quantidade tem atualização otimista, com rollback da cópia anterior em erro. Durante uma mutation, ações repetidas ficam bloqueadas e a cotação antiga não libera o checkout. Não há retry automático de mutations. Respostas de componentes de outra sessão desmontada não escrevem no cache novo.

Há shimmer no carregamento inicial do carrinho/pagamento, mensagens acessíveis, tentativa de recuperação e conservação dos itens em falhas. Mudança de preço produz aviso e nova cotação; insuficiência de estoque mantém os itens visíveis e bloqueia finalizar. O identificador da cotação inclui a versão do carrinho e dos NFTs; a validade informada é de cinco minutos.

## Cenários reproduzíveis

Além de `slow`, `error` e `offline`, abra `/cart?mockScenario=` com:

| Valor | Efeito |
| --- | --- |
| mutation-error | Leitura funciona; escrita falha após 800 ms, permitindo observar o rollback |
| price-changed | Emerald Ape passa a 1.25 ETH no catálogo da API |
| stock-exhausted | Edição 1/50 de Emerald Ape fica sem estoque |
| catalog-default | Restaura preço 1.19 e estoque 50 do Emerald Ape, mantendo os carrinhos |

Remova o parâmetro após selecionar o cenário. Alterações de catálogo persistem; `catalog-default` ou reset restauram a referência. Para testes HTTP, `POST /api/mock/nfts/:id` aceita price e/ou edition + available; incrementa a versão do mesmo catálogo consumido por todas as rotas. Esse é um controle de teste do mock, não uma operação do marketplace.

## Verificações e limites

`npm test`: 18 testes de unidade/integração no projeto. Incluem escrita autoritativa, cupons, disponibilidade, redução após queda de estoque, falhas, mesclagem e isolamento. A conferência interativa validou 390, 768 e 1440px; a tabela/resumo e o rodapé se reorganizam em tablet para evitar overflow, preservando desktop.

A confirmação usa pedido idempotente e snapshot confirmado da API: [PEDIDOS.md](./PEDIDOS.md). Carteiras e perfil estão integrados ao REST e o checkout exige conexão simulada: [CONTA.md](./CONTA.md). Playwright executável e Socket.IO estão descritos no README e na arquitetura.
