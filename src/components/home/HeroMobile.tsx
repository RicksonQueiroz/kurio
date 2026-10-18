/**
 * HeroMobile
 *
 * Banner principal da Home na versão mobile.
 *
 * Dimensões confirmadas no Figma:
 * - Banner: 366 × 190px
 * - Raio: 12px
 * - Conteúdo horizontal: 334 × 156px
 * - Área de textos: 188 × 156px
 * - Área de imagens: 138 × 146px
 * - Espaçamento horizontal: 8px
 *
 * Os ajustes ainda não confirmados serão validados
 * visualmente depois que o componente estiver renderizado.
 */

export function HeroMobile() {
  return (
    <section
      aria-label="Destaques da Kurio"
      className="
        relative
        h-[190px]
        w-full
        overflow-hidden
        rounded-[12px]
        bg-[url('/images/hero/mobile-background.svg')]
        bg-cover
        bg-center
        bg-no-repeat
        md:hidden
      "
    >
      {/*
        Contêiner interno do banner.

        No Figma:
        - Largura: 334px
        - Layout horizontal
        - Espaçamento entre textos e imagens: 8px

        O padding horizontal de 16px posiciona os
        334px dentro dos 366px do banner.
      */}
      <div className="relative z-10 flex w-full gap-2 px-4">
        {/*
          Coluna de textos.

          Dimensões confirmadas:
          188 × 156px.
        */}
        <div className="flex h-[156px] w-[188px] shrink-0 flex-col">
          {/*
            Texto de apresentação.

            Fonte: Roboto Mono
            Tamanho: 12px
            Peso: 500
            Altura da linha: 16px
            Cor: #F5F1EB
          */}
          <span className="text-[12px] leading-[16px] font-medium text-[#F5F1EB]">
            Bem-vindo à Kurio
          </span>

          {/*
            Título principal mobile.

            Fonte: Roboto Mono
            Tamanho: 18px
            Peso: 700
            Altura da linha: 29px
            Cor: #F5F1EB
          */}
          <h1 className="text-[18px] leading-[29px] font-bold text-[#F5F1EB]">
            SEJA DONO DA CULTURA DIGITAL
          </h1>

          {/*
            Descrição do banner.

            Fonte: Roboto Mono
            Tamanho: 12px
            Peso: 400
            Altura da linha: 18px
            Cor: #CFB28C
          */}
          <p className="text-[12px] leading-[18px] font-normal text-[#CFB28C]">
            Descubra NFTs selecionados de criadores do mundo todo.
          </p>

          {/* Link de exploração com o ícone original do Figma.
    O flex mantém o texto e a seta alinhados horizontalmente. */}
          <a
            href="#catalogo"
            className="inline-flex w-fit items-center gap-2 text-[12px] font-bold text-[#D28A4C]"
          >
            EXPLORAR
            {/* SVG original exportado do Figma. */}
            <img
              src="/icons/seta.svg"
              alt=""
              aria-hidden="true"
              className="h-4 w-4"
            />
          </a>
        </div>

        {/*
          Grupo das imagens.

          Dimensões confirmadas:
          - Largura: 138px
          - Altura: 146px
          - Raio: 16px

          A posição e o tamanho da imagem secundária
          ainda serão validados visualmente.
        */}
        <div className="relative h-[146px] w-[138px] shrink-0 overflow-hidden rounded-[16px]">
          {/*
            Imagem principal: Emerald Ape.
            Arquivo exportado do Figma.
          */}
          <img
            src="/images/hero/Frame136.webp"
            alt="Emerald Ape"
            className="h-full w-full object-cover"
          />

          {/*
            Imagem secundária: Sage.
            Sobreposta à imagem principal.
          */}
          <img
            src="/images/hero/sage.webp"
            alt="Sage Nomad"
            className="absolute bottom-0 left-0 w-[55px]"
          />
        </div>
      </div>

      {/*
        Indicadores visuais do carrossel.

        Utilizamos três pontos, conforme a referência.
        Tamanho, espaçamento e posição ainda precisam
        ser confirmados no Figma.

        A interação do carrossel será implementada
        posteriormente.
      */}
      <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className="h-[6px] w-[6px] rounded-full bg-[#D28A4C]"
          />
        ))}
      </div>
    </section>
  );
}
