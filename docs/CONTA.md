# Conta, carteiras e favoritos

Os formulários consultam e alteram dados por Axios + TanStack Query + MSW. Chaves de cache incluem o usuário e são removidas pelo ciclo de sessão existente. Componentes não leem nem gravam o banco de perfil/carteiras. Os handlers migram os dados antigos da própria conta e persistem seus recursos em `kurio-mock-account-data-v1`.

| Recurso | Contrato |
|---|---|
| Perfil/avatar/senha | `GET /api/profile`, `PATCH /api/profile` com `{profile,password?:{current,next}}` |
| Carteiras | `GET /api/wallets`, `PUT /api/wallets/primary`, `PUT /api/wallets/secondary` |
| Conexão simulada | `GET/POST/DELETE /api/wallets/connect`; POST recebe `{wallet,network}` |
| Favoritos | `GET /api/favorites`, `PUT/DELETE /api/favorites/:id` |

A alteração de perfil valida obrigatórios, e-mail em conflito, formato e tamanho do avatar raster. Quando há senha, a senha atual é comparada com PBKDF2 antes de gravar o novo salt/hash; o texto original não é persistido. Os erros da API são associados aos campos. A sessão é revalidada depois da atualização.

Carteiras validam campos, rede, provedor e endereço (0x para Ethereum/Polygon e base58 para Solana). Cada seção é salva separadamente. Alterar o cadastro desconecta a seleção antiga. O pagamento apresenta somente carteiras cadastradas pela conta e exige conexão na rede escolhida. O handler de pedidos também valida essa conexão, mesmo que a UI seja contornada.

`?mockScenario=wallet-rejected` recusa a conexão sem conectar a carteira. O botão de desconexão chama DELETE; a confirmação fica bloqueada enquanto desconectada. São operações fictícias: não acessam extensão, assinatura, seed phrase, chave privada ou blockchain.

Favoritos são idempotentes e privados. O detalhe oferece autenticação ao visitante e persiste a escolha pela API. `/favorites` permite consultar a lista pela conta e pela barra mobile. O carregamento e a mutation bloqueiam cliques antes de conhecer o estado remoto.

`tests/account.test.ts` verifica conflito de perfil, validação e troca de senha, endereço inválido, preservação das duas carteiras, recusa/desconexão, favoritos, falhas transitórias e isolamento entre contas. No navegador foram conferidos cadastro de carteira com refresh, favorito/lista de interesse, perfil salvo com refresh, carteira cadastrada no checkout e recusa de conexão/pedido mobile. Dados usados nessas verificações são fictícios.
