// Apresenta o destaque inicial na composição desktop do Figma.
export function HeroDesktop() {
  return (
    <section
      aria-label="Destaques da Kurio"
      className="relative mx-auto hidden h-[450px] w-full max-w-[1200px] md:block"
    >
      {/* Área de conteúdo do Hero desktop. */}
      <div className="flex h-full items-center justify-between px-10">
        {/* Coluna esquerda: textos e botão. */}
        <div className="flex w-[600px] flex-col gap-11">
          {/* Grupo de textos com espaçamento de 8px. */}
          <div className="flex flex-col gap-2">
            <span className="text-[#F5F1EB]">Bem-vindo à Kurio</span>
            {/* Título principal do Hero desktop.
    O tamanho é um ajuste visual inicial a partir da referência. */}
            <h1 className="max-w-[600px] text-[36px] leading-[1.25] font-bold text-[#F5F1EB] max-[1023px]:text-[28px]">
              SEJA DONO DO FUTURO
              <br />
              DA ARTE DIGITAL
            </h1>

            <p className="text-[#CFB28C]">
              Descubra NFTs selecionados de criadores emergentes e consagrados.
              Colecione arte digital rara, apoie artistas e tenha uma parte da
              cultura da internet.
            </p>
          </div>

          {/* Botão que levará ao catálogo de NFTs. */}
          <a
            href="#catalogo"
            className="w-fit rounded bg-[#D28A4C] px-6 py-3 font-bold text-[#140D0A]"
          >
            EXPLORAR
          </a>
        </div>

        {/* Imagem principal.
            Dimensão provisória até confirmarmos a área visível no Figma. */}
        <img
          src="/images/hero/Frame136.webp"
          alt="NFT Emerald Ape"
          className="h-[380px] w-[380px] rounded-[24px] object-cover max-[1023px]:size-[280px]"
        />
      </div>

      {/* Indicadores visuais do carrossel. */}
      {/* Indicadores posicionados na extremidade direita da coluna textual. */}
      <div className="absolute bottom-10 left-[calc(50%-140px)] flex gap-2">
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
