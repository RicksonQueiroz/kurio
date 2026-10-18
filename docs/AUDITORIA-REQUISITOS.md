# Kurio — conferência do desafio

> Registro histórico de 17/10. A base de API, dinheiro decimal, lint e autenticação foram implementados em 18/10; consulte [API-SIMULADA.md](./API-SIMULADA.md) e [AUTENTICACAO.md](./AUTENTICACAO.md) para o estado atualizado desses blocos. As lacunas abaixo retratam a conferência original.

Conferência realizada em 17/10/2026, comparando o código local com o [enunciado oficial](https://github.com/junglegaming/frontend-challenge#readme).

## Conclusão

Existem interfaces para as nove telas principais. Isso não representa nove fluxos concluídos nem uma aprovação de fidelidade visual em todos os tamanhos. A estrutura visual pode ser aproveitada; a camada funcional ainda precisa ser implementada.

Correção de escopo: a entrega usa APIs, autenticação, carteiras e pagamentos simulados. Integrações reais com blockchain ou gateways não são necessárias. A simulação deve acontecer pela rede, usando MSW, Axios, TanStack Query e Socket.IO; interfaces demonstrativas isoladas não substituem essa camada.

## Evidências no código atual

| Área | O que existe | Lacuna observada |
|---|---|---|
| Catálogo | `src/components/home/NFTCatalog.tsx` importa a lista de `src/data/nfts.ts` e filtra preço em memória | Não há consulta HTTP, paginação, ordenação ou estado de filtros na URL |
| Detalhes | Rota por identificador, seleção de edição/quantidade e favorito em estado React | Sem disponibilidade por edição; quantidade sem limite de estoque; favorito não é persistido por usuário |
| Compra mobile | Ícone adiciona ao carrinho e navega | O botão separado “Comprar NFT” continua sem handler |
| Carrinho | `CartContext.tsx` permite adicionar, remover, editar e restaurar itens | Cotação local, cupom sem aplicação e nenhuma sincronização com catálogo remoto |
| Valores | `NFT.price` é `number`; totais multiplicam números e formatam com `toFixed` | Modelo monetário ainda não usa strings decimais e cálculo exato |
| Autenticação | `useAuthForm.ts` valida campos | Termina em mensagem de indisponibilidade; não cria conta, sessão ou logout |
| Pagamento | Formulário desktop, opções mobile e resumo | Carteiras ilustrativas estão fixas em `Payment.tsx`; não são lidas do cadastro de carteiras |
| Pedido | `handleConfirmOrder` copia o carrinho para um estado local | Não há criação, identificação persistida, processamento ou consulta de pedido; refresh elimina a prévia |
| Recibo | Modal recebe uma cópia dos itens e valores | É identificado como demonstração; não corresponde a uma resposta de pedido confirmado |
| Perfil | Dados e avatar persistem em `kurio-profile` | Senha não é alterada e os dados não estão associados a uma sessão |
| Carteiras | Principal e secundária persistem em `kurio-wallets` | Cadastros não são consumidos pelo checkout; não há simulação de conexão |
| Isolamento | Chaves locais globais para perfil, carteiras e carrinho | Não existe separação por usuário nem proteção das rotas privadas |
| TanStack Query | `QueryClientProvider` configurado em `src/app/providers.tsx` | Não foram encontradas consultas ou mutations efetivas |
| Axios | Dependência instalada | Não foi encontrado cliente HTTP em uso no código |
| shadcn/ui | Há `src/components/ui/button.tsx` | Não foram encontradas importações desse componente nas telas |
| Mocks e eventos | Não há implementação em `src` nem dependências correspondentes no manifesto | MSW e cliente Socket.IO pendentes |
| Testes | Foram feitas validações interativas no navegador durante o desenvolvimento | Não existem suíte/configuração Playwright, baselines ou relatórios de execução no projeto |
| Documentação | `README.md` ainda contém o template do Vite | Não documenta execução específica do Kurio, cenários, contratos ou decisões |

## Verificações executadas nesta conferência

- `npm run build`: aprovado, incluindo TypeScript. O Vite informa um aviso sobre `__dirname` na configuração.
- `npm run lint`: reprovado em duas ocorrências de `react-refresh/only-export-components`:
  - `src/components/ui/button.tsx:57`;
  - `src/contexts/CartContext.tsx:203`.
- Não foram executados E2E ou Lighthouse: ainda não há configuração dessas ferramentas.
- Não foi identificada configuração de deploy no diretório. A existência de uma publicação externa não foi verificada.

## Critérios que precisam orientar a próxima implementação

- REST tipado com mocks determinísticos, cenários de falha e reset.
- Sessão recuperável, rotas privadas e dados isolados por usuário.
- Catálogo com parâmetros na URL; cotação autoritativa e precisão decimal.
- Pedidos idempotentes, estados recuperáveis e recibo persistido.
- Eventos versionados, reconciliação e descarte de duplicatas.
- Estados assíncronos, acessibilidade, responsividade e uso efetivo de shadcn/ui.
- Playwright executável, regressão visual, auditorias Lighthouse e deploy reproduzível.

Esses critérios são resumidos; a referência normativa continua sendo o enunciado oficial. Não é necessário criar páginas de suporte, atividade, ofertas ou downloads.

## Ordem recomendada, preservando o plano de 11 etapas

1. **Etapa 1 — configuração:** corrigir lint global e criar os comandos de verificação que faltam.
2. **Base para etapas 3/4/6/7:** definir contratos, dinheiro decimal, fixtures, banco simulado e cliente Axios; iniciar MSW antes de mover regras para novas telas.
3. **Etapa 4 — conta e sessão:** implementar autenticação simulada, expiração, retorno ao fluxo anterior e isolamento dos dados.
4. **Etapa 3 — catálogo e detalhe:** substituir a lista local por consultas e conectar os controles existentes.
5. **Etapas 4 e 6 — compra:** migrar carrinho, cotação, carteiras e pedidos para a mesma simulação.
6. **Etapa 7 — perfil e carteiras:** substituir o armazenamento direto das telas por queries/mutations, incluindo senha e erros de API.
7. **Etapas 5 e 9 — testes:** introduzir testes enquanto cada fluxo é conectado, ampliando para falhas e regressão visual.
8. **Etapa 8 — tempo real:** conectar os eventos aos mesmos recursos e validar reconexão.
9. **Etapas 2 e 9 — revisão:** concluir navegação, estados e acessibilidade nas larguras previstas.
10. **Etapa 10 — entrega técnica:** auditorias, documentação e publicação.
11. **Etapa 11 — fechamento:** executar o checklist completo em checkout limpo e corrigir o restante.

O cronograma original de 16 horas não deve ser reutilizado como previsão restante. Uma nova estimativa deve ser feita por bloco após definir os contratos e a estrutura dos mocks.

## Próxima ação concreta

Iniciar pela base funcional: corrigir os dois erros de lint, definir contratos e valores decimais e configurar MSW + Axios. Depois integrar autenticação e uma primeira consulta do catálogo, sem reconstruir os layouts aprovados.

Esta conferência adicionou apenas este documento; não alterou o comportamento da aplicação.
