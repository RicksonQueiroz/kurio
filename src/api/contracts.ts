/** Contratos de transporte compartilhados entre Axios, mocks e testes. */
export type EthAmount = string;
/** Redes aceitas pelos filtros e cadastros desta demonstração. */
export type Network = "Ethereum" | "Polygon" | "Solana";
/** Edições que podem ser selecionadas nos detalhes e no carrinho. */
export type Edition = "1/1" | "1/10" | "1/50" | "ABERTA";
/** Dados básicos necessários para apresentar a arte e seu preço. */
export type NFT = {
    /** Identificador estável do recurso; não depende da posição na lista. */
    id: string;
    /** Nome do NFT apresentado nos cards, detalhes e resumos. */
    name: string;
    /** Preço unitário autoritativo em ETH, representado como string decimal. */
    price: EthAmount;
    /** Caminho da imagem utilizada na apresentação do NFT. */
    image: string;
};
/** Acrescenta classificação, versão e disponibilidade aos dados básicos do NFT. */
export type CatalogNFT = NFT & {
    /** Coleção à qual o NFT pertence, utilizada no filtro do catálogo. */
    collection: string;
    /** Rede do NFT ou rede solicitada no filtro. */
    network: Network;
    /** Data de criação em formato ISO, utilizada na ordenação por lançamento. */
    createdAt: string;
    /** Indicador numérico utilizado na ordenação por popularidade. */
    popularity: number;
    /** Versão do recurso, alterada quando seus dados são modificados. */
    version: number;
    /** Estoque disponível para cada edição oferecida pelo NFT. */
    editions: {
        /** Identifica a edição escolhida, separando variantes do mesmo NFT. */
        edition: Edition;
        /** Quantidade inteira de unidades ainda disponíveis nesta edição. */
        available: number;
    }[];
};
/** Parâmetros enviados na consulta do catálogo; propriedades opcionais omitem o filtro. */
export type CatalogParams = {
    /** Texto da busca por nome ou identificador do NFT. */
    q?: string;
    /** Coleção à qual o NFT pertence, utilizada no filtro do catálogo. */
    collection?: string;
    /** Rede do NFT ou rede solicitada no filtro. */
    network?: Network;
    /** Preço máximo em ETH; usa texto decimal na requisição. */
    maxPrice?: EthAmount;
    /** Critério de ordenação aceito pela listagem. */
    sort?: "recent" | "price-asc" | "price-desc" | "popular";
    /** Página solicitada ou devolvida, iniciando em 1. */
    page?: number;
    /** Quantidade máxima de itens por página. */
    pageSize?: number;
};
/** Resultado paginado da API, com itens da página e totais da consulta. */
export type CatalogResponse = {
    /** Contagens globais das fixtures, sem inventar totais na interface. */
    facets: { collections: Record<string, number>; networks: Record<string, number> };
    /** Linhas da página ou do carrinho devolvidas pela API. */
    items: CatalogNFT[];
    /** Número total de NFTs que correspondem aos filtros, antes de recortar a página. */
    total: number;
    /** Página solicitada ou devolvida, iniciando em 1. */
    page: number;
    /** Quantidade máxima de itens por página. */
    pageSize: number;
    /** Número total de páginas para os filtros e tamanho atuais. */
    pages: number;
};
/** Formato comum dos erros HTTP, incluindo mensagens opcionais por campo. */
export type ApiErrorResponse = {
    /** Agrupa o código e a mensagem da falha devolvida pelo servidor. */
    error: {
        /** Identificador da regra que falhou, independente do texto apresentado. */
        code: string;
        /** Mensagem que pode ser apresentada ao usuário. */
        message: string;
        /** Associa os nomes dos campos às mensagens de validação correspondentes. */
        fields?: Record<string, string>;
    };
};
/** Nomes aceitos para reproduzir condições de rede e de negócio nos mocks. */
export type MockScenario = "default" | "empty" | "slow" | "error" | "offline" | "out-of-order" | "session-expired" | "mutation-error" | "price-changed" | "stock-exhausted" | "catalog-default" | "order-declined" | "order-pending" | "order-timeout" | "wallet-rejected";
/** A resposta pública nunca contém senha ou hash de credenciais. */
export type SessionUser = {
    /** Identificador estável do recurso; não depende da posição na lista. */
    id: string;
    /** Nome de usuário informado no cadastro ou identificado na sessão. */
    username: string;
    /** E-mail da conta, normalizado pela simulação para comparação. */
    email: string;
};
/** Sessão consultada pelo token já existente no navegador. */
export type SessionResponse = {
    /** Identidade pública vinculada à sessão. */
    user: SessionUser;
    /** Instante de vencimento em milissegundos desde a época Unix. */
    expiresAt: number;
};
/** Resposta de login ou cadastro; acrescenta o token à sessão pública. */
export type AuthResponse = SessionResponse & {
    /** Identificador opaco da sessão fictícia utilizado no cabeçalho Authorization. */
    token: string;
};
/** Dados digitados para autenticar; password é enviado para validação e não fica no perfil. */
export type LoginInput = {
    /** E-mail da conta, normalizado pela simulação para comparação. */
    email: string;
    /** Senha usada somente para validar a entrada ou derivar o hash do cadastro. */
    password: string;
};
/** Acrescenta o nome de usuário aos dados necessários para criar a conta. */
export type RegisterInput = LoginInput & {
    /** Nome de usuário informado no cadastro ou identificado na sessão. */
    username: string;
};
/** Carrinho transporta apenas identificadores na escrita; preços vêm do catálogo da API. */
export type CartLineInput = {
    /** Identificador do NFT que a API deve localizar no catálogo. */
    nftId: string;
    /** Identifica a edição escolhida, separando variantes do mesmo NFT. */
    edition: string;
    /** Quantidade inteira selecionada para o NFT e a edição. */
    quantity: number;
};
/** Linha autoritativa devolvida pela API, incluindo estoque e versão do NFT. */
export type CartLine = {
    /** Dados do NFT consultados pela API para esta linha do carrinho. */
    nft: NFT;
    /** Identifica a edição escolhida, separando variantes do mesmo NFT. */
    edition: string;
    /** Quantidade inteira selecionada para o NFT e a edição. */
    quantity: number;
    /** Quantidade inteira de unidades ainda disponíveis nesta edição. */
    available: number;
    /** Versão do NFT usada para calcular esta linha e identificar mudanças posteriores. */
    nftVersion: number;
};
/** Resumo monetário e condições que determinam se a seleção pode seguir para o pagamento. */
export type CartQuote = {
    /** Identifica a cotação e as versões de carrinho e NFTs consideradas no cálculo. */
    id: string;
    /** Instante de vencimento em milissegundos desde a época Unix. */
    expiresAt: number;
    /** Versão do carrinho à qual a cotação está vinculada. */
    cartVersion: number;
    /** Soma dos preços unitários multiplicados pelas quantidades, antes de desconto e taxa. */
    subtotal: EthAmount;
    /** Desconto exato em ETH validado pela regra de cupom. */
    discount: EthAmount;
    /** Taxa de rede fictícia em ETH informada pela cotação. */
    networkFee: EthAmount;
    /** Subtotal menos desconto, acrescido da taxa de rede, como decimal exato em ETH. */
    total: EthAmount;
    /** Cupom validado aplicado ao carrinho, ou null quando não há cupom. */
    coupon: string | null;
    /** Indica se existem itens e se a cotação está livre de impedimentos de disponibilidade. */
    valid: boolean;
    /** Problemas que impedem finalizar a seleção, como estoque insuficiente. */
    issues: string[];
};
/** Reúne as linhas do carrinho, sua versão, a cotação e os avisos informativos. */
export type CartResponse = {
    /** Linhas da página ou do carrinho devolvidas pela API. */
    items: CartLine[];
    /** Versão do recurso, alterada quando seus dados são modificados. */
    version: number;
    quote: CartQuote;
    /** Avisos informativos, como mesclagem do visitante ou mudança de preço. */
    notices: string[];
};

/** Tentativa de compra: valores monetários são sempre recalculados pelo servidor. */
export type OrderInput = {
    /** Cotação revisada pelo usuário e seu vencimento original. */
    quoteId: string;
    quoteExpiresAt: number;
    /** Provedor e rede escolhidos no pagamento simulado. */
    provider: string;
    network: Network;
    wallet: string;
    /** Campos do formulário desktop, quando esse layout inicia a compra. */
    collector?: Record<string, string>;
};
/** Snapshot persistido: o catálogo não pode alterar um recibo já emitido. */
export type Order = {
    id: string;
    userId: string;
    status: "pending" | "confirmed" | "declined";
    createdAt: string;
    /** Referência fictícia; não representa uma transação na blockchain. */
    transactionId: string | null;
    reason: string | null;
    input: OrderInput;
    items: CartLine[];
    provider: string;
    subtotal: EthAmount;
    discount: EthAmount;
    networkFee: EthAmount;
    total: EthAmount;
};

