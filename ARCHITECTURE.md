# Arquitetura e decisões do Kurio

## Fluxo de dados

A interface React/TypeScript usa TanStack Router para rotas e estado de descoberta na URL. Axios é o transporte REST único, com timeout de 10 segundos, identidade de visitante e token de sessão. TanStack Query controla consultas/mutations e separa dados privados pela chave `[recurso, userId, ...parâmetros]`.

MSW intercepta a rede antes de montar React. Os handlers mantêm dados consistentes de catálogo, contas, carrinho, perfil, carteiras, favoritos e pedidos. A persistência local pertence à simulação da API. Rascunhos de formulário e diário de tentativa pertencem à interface e são separados por usuário. Não há integração real com blockchain, carteira ou pagamento.

## Sessão e isolamento

Duas contas fictícias exercitam conflito e troca de usuário. Senhas são derivadas com PBKDF2/SHA-256, salt por conta e 100 mil iterações; não ficam em texto no armazenamento. A sessão dura 30 minutos. Consulta de sessão e relógio local observam expiração. O interceptor trata 401 sem encerrar uma sessão nova por causa de uma resposta antiga.

Rotas privadas mantêm o destino enquanto pedem autenticação. Logout/troca cancelam consultas, limpam caches privados e liberam listeners/subscriptions. Expiração preserva o rascunho e a tentativa de compra da mesma conta. Trata-se de autenticação simulada; o armazenamento de token no navegador não é uma recomendação de arquitetura de segurança para produção.

## Cache e mutations

Consultas de catálogo usam chave completa, sinal de cancelamento e stale time padrão de 30 segundos. Carrinho é revalidado na entrada/foco, após mutations, após eventos e por polling REST de contingência a cada 15 segundos. A alteração de quantidade antecipa o valor, invalida a cotação e restaura o snapshot anterior em falhas. O servidor é a referência de preço, cupom, estoque e taxas.

Pedidos usam chave de idempotência e corpo persistidos antes do envio, não têm retry automático e podem ser recuperados pela mesma tentativa. O recibo só abre para estado confirmado. Seu snapshot não depende do catálogo depois da compra. A baixa remove somente a quantidade comprada e os estados confirmado/recusado são terminais. A URL identifica o pedido para refresh/acesso direto.

## Eventos com MSW e Socket.IO

O cliente efetivo é `socket.io-client`, com transporte WebSocket e caminho `/kurio-socket/`. MSW intercepta a conexão e `@mswjs/socket.io-binding` codifica/decodifica Engine.IO/Socket.IO. Foi adotado MSW 2 por compatibilidade com o peer dependency do binding, sem forçar a árvore de dependências. A aplicação é importada depois de ativar o worker para o cliente capturar o WebSocket interceptado.

- `nft.updated`: identificador do evento, NFT, versão, preço/edições e instante. O mesmo handler que altera o catálogo emite o evento.
- `order.updated`: identificador do evento, pedido, usuário, versão e estado. Só é enviado às conexões cuja sessão foi resolvida pelo mock.
- `session.subscribe`: cliente apresenta o token; o mock valida a conta e envia snapshot público e pedidos da própria conta. Uma versão da subscription impede resposta antiga de reassinar outra identidade.

A interface descarta versões antigas/duplicadas e invalida as consultas REST afetadas. Na reconexão recebe snapshots e reconcilia recursos ativos. A troca de sessão fecha a conexão anterior. Timers e transições ficam nos mocks, sem callbacks de negócio fabricados na UI. O binding limita namespaces, binários e rooms; o projeto usa somente namespace raiz, eventos JSON e autorização explícita por conexão. Não é necessário servidor Socket.IO externo para executar/publicar a demonstração.

## UI, assets e desempenho

Tailwind e componentes shadcn/ui adaptados mantêm a identidade. O CSS auxiliar distribuído pelo shadcn 4.22.0 foi mantido localmente com licença em `src/vendor/shadcn`; a CLI de geração foi removida da execução, junto de dependências desnecessárias. Isso não remove os componentes da aplicação.

Os PNGs incorporados nos SVGs exportados tinham megabytes e elevado custo de decodificação. `scripts/optimize-assets.mjs` gera versões WebP dos mesmos rasters, com dimensão adequada e qualidade 90; os originais permanecem em `public/images`. Os caminhos de origem/destino estão no mapeamento do script. Não foram geradas novas artes. Rotas carregam código sob demanda e cards usam carregamento de imagem lazy.

## Decisões de UX e desvios do Figma

- Contornos de foco, bordas de campos mais claras, erros associados e atalho para pular ao conteúdo.
- Busca desktop, ordenação, paginação e gaveta mobile adicionadas para comportamentos obrigatórios; usam os mesmos tons e tipografia.
- Contagens de coleção/rede são os totais reais das fixtures, em vez dos números ilustrativos.
- A galeria usa a única arte disponível e recortes superior/central/inferior; não atribui imagens de outro NFT à obra.
- Conexão/desconexão simulada e estados de pedido foram acrescentados com feedback acessível. O recibo informa a referência fictícia e não abre um Etherscan real.
- Tablet empilha colunas e formulários; a tabela do recibo se adapta a telas estreitas.

## Limites da demonstração

A persistência MSW é por navegador/origem, não um banco compartilhado entre máquinas. Controles de cenário/reset são exclusivos da simulação e não são endpoints de produção. Fontes, imagens, fixtures e mocks são locais. A publicação deve manter HTTPS/Service Worker e fallback de SPA; não deve definir `VITE_ENABLE_MOCKS=false` sem um backend compatível.

Relatórios de testes e desempenho documentam os resultados medidos. A revisão adicional executa zoom real de 200% pela API do navegador em perfil descartável e ativa movimento reduzido no Playwright; as evidências ficam no relatório HTML. Isso não equivale a certificação de acessibilidade nem substitui avaliação com leitor de tela. A URL pública e o repositório só poderão ser registrados depois de definir/publicar o destino de entrega.
