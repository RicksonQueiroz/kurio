import { Link } from "@tanstack/react-router";
import { useState } from "react";

// Benefícios apresentados na parte superior do rodapé.
const benefits = [
  {
    title: "Segurança da carteira",
    description:
      "Proteja sua carteira e colecione arte digital verificada com confiança.",
    icon: "W",
  },
  {
    title: "Criadores em destaque",
    description:
      "Conheça artistas, estúdios e coleções de uma nova era digital na rede.",
    icon: "C",
  },
  {
    title: "Alertas de lançamentos",
    description:
      "Receba calendários de novas coleções, novidades e listas de acesso a emissões do mercado.",
    icon: "D",
  },
];

// Ícones das redes sociais exportados do Figma.
// Caminho físico: public/icons/rede/
const socialIcons = [
  {
    name: "Facebook",
    src: "/icons/rede/Facebook.svg",
  },
  {
    name: "Instagram",
    src: "/icons/rede/Instagram.svg",
  },
  {
    name: "Twitter",
    src: "/icons/rede/Twitter.svg",
  },
  {
    name: "LinkedIn",
    src: "/icons/rede/Linkedin.svg",
  },
  {
    name: "YouTube",
    src: "/icons/rede/Union.svg",
  },
];

// Links da seção inferior.
// Apenas as rotas já implementadas devem ser navegáveis.
const profileLinks = [
  "Meu perfil",
  "Minha coleção",
  "Atividades",
  "Estúdio do criador",
  "Lista de interesse",
];

// helpLinks define os textos da coluna de ajuda, cujas páginas estão fora do escopo.
const helpLinks = [
  "Central de ajuda",
  "Como comprar NFTs",
  "Carteira e segurança",
  "Política do mercado",
  "Denunciar item",
];

// collectionLinks define os textos da coluna de coleções do rodapé.
const collectionLinks = [
  "Arte digital",
  "Fotografia",
  "Música",
  "Arte 3D",
  "Utilidade",
];

// Footer organiza os grupos de navegação e contatos definidos na referência visual.
export function Footer() {
  // Estado do campo de newsletter.
  const [email, setEmail] = useState("");

  // Mensagem apresentada após a tentativa de inscrição.
  const [message, setMessage] = useState("");

  // Ainda não existe integração real com uma API de newsletter.
  function handleNewsletterSubmit() {
    setMessage("Cadastro de newsletter ainda não disponível.");
  }

  return (
    <footer
      className="w-full bg-[#241612] font-mono text-[#F5F1EB]"
      aria-label="Rodapé do Kurio"
    >
      {/* ==========================================
          PARTE SUPERIOR
          Benefícios da plataforma e newsletter
      ========================================== */}
      <div className="grid grid-cols-4 gap-0 px-6 py-7 max-[1199px]:grid-cols-2 max-[1199px]:gap-y-6">
        {/* Os três benefícios possuem divisórias verticais. */}
        {benefits.map((benefit) => (
          <div
            key={benefit.title}
            className="min-w-0 border-r border-[#55321F] px-4 first:pl-0"
          >
            {/* Ícone circular com a inicial do benefício. */}
            <div
              className="
                mb-3
                flex h-[64px] w-[64px]
                items-center justify-center
                rounded-full
                bg-[#D28A4C]
                text-[20px] font-bold
                text-[#140D0A]
              "
            >
              {benefit.icon}
            </div>

            {/* Título do benefício. */}
            <h3
              className="
                mb-2
                text-[15px] font-bold
                leading-[18px]
                text-[#F5F1EB]
              "
            >
              {benefit.title}
            </h3>

            {/* Descrição do benefício. */}
            <p
              className="
                text-[12px]
                leading-[19px]
                text-[#CFB28C]
              "
            >
              {benefit.description}
            </p>
          </div>
        ))}

        {/* Newsletter. */}
        <div className="min-w-0 pl-4">
          <h3
            className="
              mb-3
              text-[16px] font-bold
              leading-[17px]
              text-[#F5F1EB]
            "
          >
            Antecipe-se ao próximo lançamento
          </h3>

          {/* Formulário visual da newsletter. */}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              handleNewsletterSubmit();
            }}
            className="
              flex h-[36px]
              overflow-hidden
              rounded-[5px]
              bg-[#38220F]
            "
          >
            <input
              type="email"
              required
              aria-label="E-mail para newsletter"
              placeholder="digite seu e-mail..."
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setMessage("");
              }}
              className="
                min-w-0 flex-1
                bg-transparent
                px-3
                text-[11px]
                text-[#F5F1EB]
                outline-none
                placeholder:text-[#A98B68]
              "
            />

            <button
              type="submit"
              className="
                shrink-0
                bg-[#D28A4C]
                px-3
                text-[13px] font-bold
                text-[#140D0A]
                hover:bg-[#E89B55]
              "
            >
              Enviar
            </button>
          </form>

          {/* Descrição da newsletter. */}
          <p
            className="
              mt-3
              text-[11px]
              leading-[19px]
              text-[#CFB28C]
            "
          >
            Receba lançamentos selecionados, histórias de criadores e novidades
            do mercado.
          </p>

          {/* Feedback sem simular inscrição concluída. */}
          {message && (
            <p role="status" className="mt-2 text-[11px] text-[#E89B55]">
              {message}
            </p>
          )}
        </div>
      </div>

      {/* ==========================================
          FAIXA CENTRAL
          Identidade e informações institucionais
      ========================================== */}
      <div
        className="
          grid grid-cols-4 max-[1199px]:grid-cols-2
          items-center gap-4
          bg-[#38220F]
          px-6 py-5
          text-[12px]
          leading-[18px]
          text-[#F5F1EB]
        "
      >
        {/* Nome da plataforma. */}
        <span className="font-bold tracking-widest">KURIO</span>

        {/* Descrição institucional. */}
        <span>Feito para colecionadores, criadores e cultura</span>

        {/* Dados de contato ilustrativos do layout. */}
        <span>contato@email.com</span>

        <span>+55 11 4002 8922</span>
      </div>

      {/* ==========================================
          PARTE INFERIOR
          Navegação e redes sociais
      ========================================== */}
      <div className="grid grid-cols-4 gap-6 px-6 pt-7 pb-5 max-[1199px]:grid-cols-2">
        {/* COLUNA 1: Meu perfil. */}
        <div className="min-w-0">
          <h3
            className="
              mb-3
              text-[18px] font-bold
              leading-[16px]
              text-[#F5F1EB]
            "
          >
            Meu perfil
          </h3>

          <div
            className="
              flex flex-col gap-2
              text-[12px]
              leading-[18px]
              text-[#F5F1EB]
            "
          >
            {/* Meu perfil agora abre a tela da conta; os demais destinos seguem pendentes. */}
            {profileLinks.map((item) => item === "Meu perfil" ? (
              <Link key={item} to="/profile" className="hover:text-[#E89B55]">{item}</Link>
            ) : (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>

        {/* COLUNA 2: Central de ajuda. */}
        <div className="min-w-0">
          <h3
            className="
              mb-3
              text-[18px] font-bold
              leading-[16px]
              text-[#F5F1EB]
            "
          >
            Central de ajuda
          </h3>

          <div
            className="
              flex flex-col gap-2
              text-[12px]
              leading-[18px]
              text-[#F5F1EB]
            "
          >
            {helpLinks.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>

        {/* COLUNA 3: Coleções. */}
        <div className="min-w-0">
          <h3
            className="
              mb-3
              text-[18px] font-bold
              leading-[16px]
              text-[#F5F1EB]
            "
          >
            Coleções
          </h3>

          <div
            className="
              flex flex-col gap-2
              text-[12px]
              leading-[18px]
              text-[#F5F1EB]
            "
          >
            {collectionLinks.map((item) =>
              item === "Arte digital" ? (
                <Link key={item} to="/" className="hover:text-[#E89B55]">
                  {item}
                </Link>
              ) : (
                <span key={item}>{item}</span>
              ),
            )}
          </div>
        </div>

        {/* COLUNA 4: Redes sociais e carteiras. */}
        <div className="min-w-0">
          {/* Título das redes sociais. */}
          <h3
            className="
              mb-3
              text-[18px] font-bold
              leading-[16px]
              text-[#F5F1EB]
            "
          >
            Redes sociais
          </h3>

          {/* Ícones com borda, conforme o Figma. */}
          <div className="mb-7 flex items-center gap-[6px]">
            {socialIcons.map((social) => (
              <div
                key={social.src}
                className="
                  flex h-[27px] w-[27px]
                  shrink-0
                  items-center justify-center
                  rounded-[5px]
                  border border-[#D28A4C]
                "
              >
                <img
                  src={social.src}
                  alt={social.name}
                  title={social.name}
                  className="
                    h-[16px] w-[16px]
                    object-contain
                  "
                />
              </div>
            ))}
          </div>

          {/* Título das carteiras compatíveis.
              Valores de tipografia conferidos no Figma. */}
          <h3
            className="
              mb-2
              whitespace-nowrap
              text-[18px] font-bold
              leading-[16px]
              text-[#F5F1EB]
            "
          >
            Carteiras compatíveis
          </h3>

          {/* Cápsula das carteiras:
              228px de largura
              26px de altura
              6px de raio
              Borda #55321F
              Fundo #38220F */}
          <div
            className="
              flex h-[26px] w-[228px]
              max-w-full
              items-center justify-center
              rounded-[6px]
              border border-[#55321F]
              bg-[#38220F]
              px-[4px]
            "
          >
            <p
              className="
                whitespace-nowrap
                text-[9px] font-bold
                leading-none
                tracking-[0.1px]
                text-[#E89B55]
              "
            >
              METAMASK · WALLETCONNECT · COINBASE
            </p>
          </div>
        </div>
      </div>

      {/* ==========================================
          DIREITOS AUTORAIS
      ========================================== */}
      <div
        className="
          px-6 pb-5
          text-center
          text-[10px]
          text-[#CFB28C]
        "
      >
        © 2026 Kurio. Propriedade digital para todos.
      </div>
    </footer>
  );
}
