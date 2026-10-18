# Arquitetura e decisões

## Organização e transporte

`src/api` define contratos e chamadas; `src/mocks` contém fixtures, bancos e handlers; `src/contexts` compartilha sessão, carrinho e filtros; `src/pages` e `src/components` compõem a interface. `tests` cobre regras/HTTP e `e2e` contém os fluxos Playwright e baselines.

React/TypeScript usa TanStack Router para rotas, parâmetros e proteção dos fluxos privados. Busca, coleção, rede, preço, ordenação e página ficam na URL; alterar filtros reinicia a paginação. Axios é o cliente REST único, com timeout de 10 segundos e cancelamento por `AbortSignal`. TanStack Query controla consultas, mutations e reconciliação.

MSW é iniciado antes de importar a aplicação. Dados fictícios e regras de negócio ficam nos handlers; sua persistência local sustenta o refresh no mesmo navegador/origem. O fallback captura apenas `/api/` na raiz, preservando os módulos `/src/api/` do Vite. Rascunhos e diário de compra são estados da interface separados por usuário. Fontes, imagens e fixtures estão disponíveis localmente.

## Contratos REST

Os tipos completos estão em [src/api/contracts.ts](./src/api/contracts.ts) e os cadastros de conta em [src/lib/accountStorage.ts](./src/lib/accountStorage.ts). Recursos privados exigem `Authorization: Bearer <token>`; carrinho visitante usa `x-kurio-guest`.

| Operação | Entrada e resposta |
| --- | --- |
| `POST /api/auth/register` | `{username,email,password}` → `{user,token,expiresAt}` |
| `POST /api/auth/login` | `{email,password}` → `{user,token,expiresAt}` |
| `GET /api/auth/session` | Token → `{user,expiresAt}` |
| `POST /api/auth/logout`, `/api/auth/expire` | Token → 204; invalida ou vence a sessão |
| `GET /api/nfts` | `q,collection,network,maxPrice,sort,page,pageSize` → itens, totais, páginas e contagens de filtros |
| `GET /api/nfts/:id` | Identificador → NFT com versão e estoque por edição, ou 404 |
| `GET /api/favorites` | → `{ids,items}` privados |
| `PUT/DELETE /api/favorites/:id` | Inclui/remove favorito → `{ids}` |
| `GET /api/cart` | Identidade → `CartResponse` |
| `POST/PATCH /api/cart/items` | `{nftId,edition,quantity}` → `CartResponse`; adiciona ou substitui quantidade |
| `DELETE /api/cart/items/:nftId/:edition` | Remove uma linha → `CartResponse` |
| `DELETE /api/cart` | Esvazia itens e cupom → `CartResponse` |
| `POST/DELETE /api/cart/coupon` | POST recebe `{code}`; aplica/remove → `CartResponse` |
| `POST /api/quote` | Revalida carrinho → `CartResponse` com cotação atual |
| `POST /api/orders` | `Idempotency-Key` e `OrderInput` → pedido pendente (202) ou tentativa existente |
| `GET /api/orders/:id` | → estado e snapshot do pedido da própria conta |
| `GET/PATCH /api/profile` | Consulta ou recebe `{profile,password?:{current,next}}` → perfil confirmado |
| `GET /api/wallets` | → `{primary,secondary}` |
| `PUT /api/wallets/:slot` | Cadastro da seção `primary` ou `secondary` → conjunto das carteiras |
| `GET/POST/DELETE /api/wallets/connect` | Consulta/conecta/desconecta; POST recebe `{wallet,network}` |
| `POST /api/mock/events` | `{scenario}` → altera o banco e emite eventos pelo socket |
| `POST /api/mock/nfts/:id` | Controle de teste: altera `price` ou `edition` + `available` |
| `POST /api/mock/reset` | Restaura integralmente as fixtures e os recursos privados da demonstração |

Erros usam `{error:{code,message,fields?}}`. A simulação diferencia validação (422), sessão/credenciais inválidas (401), recurso inexistente ou de outra conta (404), conflitos (409), cupom vencido (410), indisponibilidade transitória (503) e falha de conexão. Endpoints desconhecidos da API retornam 501.

`CartResponse` contém `items`, `version`, `notices` e `quote`. A cotação inclui `id`, `expiresAt`, `cartVersion`, subtotal, desconto, taxa, total, cupom, validade e impedimentos. ETH trafega como string decimal, com cálculos exatos em wei usando `bigint`; quantidades são inteiras. A API não aceita preços do cliente como referência. Carteiras validam campos, provedor e endereço de rede: hexadecimal para Ethereum/Polygon e base58 para Solana.

## Sessão, cache e recuperação

Senhas fictícias são derivadas com PBKDF2/SHA-256, salt por conta e 100 mil iterações; não são persistidas em claro. A sessão dura 30 minutos e é recuperada pela API no refresh, no foco e a cada 30 segundos, com timer local para expiração. Um 401 antigo não encerra uma sessão mais recente. Checkout, perfil, carteiras, favoritos e pedidos exigem autenticação.

Chaves de consultas incluem usuário ou visitante e os parâmetros do recurso. Logout/troca cancelam consultas, removem caches privados, desmontam o estado anterior e liberam subscriptions. Login mescla o carrinho visitante uma vez. Expiração preserva destino, rascunho e tentativa da mesma conta; logout explícito remove rascunhos. Mudança do cadastro de carteira invalida sua conexão anterior.

O padrão de consultas é `staleTime: 30s`, um retry e sem refetch automático ao foco. Sessão, carrinho, detalhe e pedidos sobrescrevem o retry para zero. Sessão/carrinho/pedidos revalidam ao foco; carrinho também consulta a cada 15 segundos e pedido pendente a cada segundo. Mutations não têm retry automático. A quantidade do carrinho usa atualização otimista, marca a cotação como inválida e faz rollback em caso de falha. Eventos e mutations invalidam os recursos afetados.

A cotação vale cinco minutos e é renovada ao vencer ou mudar a seleção, preço ou estoque. O envio revalida cupom, taxa, disponibilidade e carteira conectada; conflito exige revisão e nova confirmação. A interface persiste a chave de idempotência e o corpo antes de enviar. Reenvio idêntico recupera o mesmo pedido; reutilizar a chave com outro conteúdo gera 409. Outra tentativa com pedido pendente retoma seu identificador.

Pedidos passam de `pending` para `confirmed` ou `declined`, ambos terminais. O recibo abre somente para confirmação da API, preserva o snapshot e usa referência fictícia `SIM-…`. Confirmação baixa estoque e subtrai apenas as quantidades compradas; recusas preservam os itens. A URL `/payment?order=<id>` e o diário por usuário permitem retomada após timeout, refresh ou reconexão.

## Socket.IO e MSW

O cliente efetivo é `socket.io-client`, com WebSocket em `/kurio-socket/`. MSW 2 e `@mswjs/socket.io-binding` interceptam e codificam o protocolo Engine.IO/Socket.IO. O caminho próprio evita a normalização especial de `/socket.io/`. A importação do cliente ocorre depois da ativação do worker. Não é necessário um servidor externo para a demonstração.

| Evento | Contrato e tratamento |
| --- | --- |
| `nft.updated` | `eventId,id,version,payload:{price,editions},sentAt`; anuncia a mudança e reconcilia catálogo, detalhe e carrinho por REST |
| `order.updated` | `eventId,id,userId,version,status`; reconcilia pedido/carrinho somente da conta proprietária |
| `session.subscribe` | Cliente apresenta `{token}`; o mock resolve a sessão e devolve o snapshot público e os pedidos da própria conta |
| `catalog.snapshot` | Lista de eventos de catálogo usada para reconciliar versões na reconexão |

O cliente descarta versões antigas e duplicadas por recurso. A reconexão refaz leituras REST dos recursos ativos. Mudança de sessão fecha a conexão anterior; uma versão da inscrição impede resolução assíncrona antiga de associar outro usuário. Listeners e heartbeat são liberados no encerramento. Timers e transições pertencem aos mocks, sem setters de negócio fabricados na UI.

O binding tem limitações de namespaces, binários e rooms: a demonstração usa namespace raiz, eventos JSON e autorização explícita por conexão. Os cenários e seu reset estão documentados no README.

## Interface, assets e limites

Tailwind e componentes shadcn/ui foram adaptados à identidade visual. O CSS auxiliar do shadcn foi mantido localmente com sua licença em `src/vendor/shadcn`; a CLI de geração não participa da execução.

Os rasters embutidos nos SVGs exportados foram derivados para WebP com qualidade 90 e dimensões adequadas; originais foram preservados. `scripts/optimize-assets.mjs` reproduz a conversão e `scripts/asset-mappings.json` registra os caminhos. Rotas carregam código sob demanda, cards usam imagens lazy e skeletons reservam dimensões.

Ajustes em relação ao Figma: foco visível, bordas de formulário com maior contraste, erros associados aos campos, atalho para o conteúdo, busca/ordenação/paginação e gaveta de filtros funcionais, contagens reais das fixtures e feedback da conexão/pedido. A galeria usa recortes da única arte disponível. Tablet empilha colunas e o recibo adapta sua tabela a telas estreitas. Referências simuladas não abrem um Etherscan real.

Dados persistem apenas por navegador/origem, sem banco compartilhado entre dispositivos. O token local e os controles de cenário são próprios da simulação, não uma arquitetura de segurança para produção. O build publicado exige HTTPS, mocks habilitados e fallback de SPA. Zoom real, movimento reduzido e reflow foram verificados; auditoria automatizada não certifica acessibilidade e não houve avaliação manual com leitor de tela.
