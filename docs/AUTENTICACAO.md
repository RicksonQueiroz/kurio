# Autenticação simulada — 18/10/2026

Cadastro, login, consulta de sessão, logout e expiração usam mutations/queries TanStack Query → Axios → MSW. Não existe autenticação externa nem login social real.

## Contas fictícias

| E-mail | Senha de demonstração |
| --- | --- |
| nova@example.com | Kurio123! |
| sage@example.com | Kurio123! |

Use somente dados fictícios. As contas cadastradas e as sessões da simulação sobrevivem ao refresh no mesmo navegador/origem. A senha não é gravada em claro: o mock guarda derivação PBKDF2/SHA-256 com salt por conta e 100 mil iterações. Isso sustenta a demonstração local; não constitui um backend de produção.

## Contrato REST

| Operação | Entrada | Resposta |
| --- | --- | --- |
| POST /api/auth/register | username, email, password | user, token, expiresAt |
| POST /api/auth/login | email, password | user, token, expiresAt |
| GET /api/auth/session | Authorization: Bearer token | user, expiresAt |
| POST /api/auth/logout | Authorization: Bearer token | 204; invalida token |
| POST /api/auth/expire | Authorization: Bearer token | 204; vence a sessão para teste |

Cadastro valida nome de 2–50 caracteres, e-mail e senha de 8–128 caracteres. O e-mail é normalizado. Validação retorna 422 com erros associados aos campos; conflito retorna 409; credenciais incorretas e sessões inválidas retornam 401. Respostas públicas nunca incluem senha, hash ou salt. Login/cadastro não têm retry automático.

## Sessão, proteção e contexto

- Token opaco em `kurio-session-token`; duração de 30 minutos. Consulta pelo servidor ao recarregar, voltar ao foco e a cada 30 segundos, além do timer local de vencimento.
- Rotas de pagamento, perfil e carteiras são protegidas na composição do TanStack Router. A URL fica preservada durante a autenticação; fechar o diálogo volta à Home.
- Uma resposta 401 de um recurso autenticado encerra somente o token que originou aquela chamada. Erro de credenciais não encerra outra sessão.
- Logout/troca de conta cancelam consultas e removem o cache anterior. O conteúdo e o carrinho são remontados por identidade. Eventos `storage` observam logout/troca em outra aba.
- O carrinho visitante é mesclado uma vez ao carrinho da conta. Perfis, carteiras e carrinhos locais usam chaves com userId; os dados globais das antigas prévias de perfil/carteiras não são atribuídos a nenhuma conta.
- O rascunho de pagamento e as seleções ficam em sessionStorage por usuário/aba. Expiração preserva esses dados e os itens; logout explícito descarta o rascunho. Outra conta não recebe o rascunho anterior.
- Os diálogos preservam foco, rolagem e navegação por Tab. Os envios mostram estado pendente e impedem cliques repetidos.

## Reproduzir cenários

`?mockScenario=slow`, `error` e `offline` também afetam autenticação. Para sessão expirada, abra uma rota privada autenticada com `?mockScenario=session-expired`; depois remova o parâmetro para entrar novamente. Os testes HTTP podem chamar `/auth/expire` e consultar a sessão para observar 401.

`POST /api/mock/reset` recria as duas contas e o catálogo, removendo tokens e recursos privados persistidos desta demonstração. Recarregue após reset para descartar estado ainda montado. Rascunhos por aba são temporários e serão sobrescritos ou descartados no logout.

## Evidências e próximos blocos

`npm test`: 12 testes de unidade/integração, incluindo login/logout, sessão, cadastro/conflito, expiração, duas contas, falha transitória e mesclagem do visitante. Conferência interativa em 390 e 1440px: cadastro mobile, conflito, checkout protegido, refresh, logout, troca de conta, expiração e retomada de campos/rede/provedor.

Perfil, avatar, alteração de senha, carteiras e favoritos usam API autenticada: [CONTA.md](./CONTA.md). Carrinho/cotação incluem mesclagem do visitante no servidor: [CARRINHO.md](./CARRINHO.md). Pedidos idempotentes estão em [PEDIDOS.md](./PEDIDOS.md). Eventos e listeners por sessão estão descritos em [ARCHITECTURE.md](../ARCHITECTURE.md); testes e auditoria são executados pelos comandos do README.
