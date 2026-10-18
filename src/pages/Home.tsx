import { HeroDesktop } from "@/components/home/HeroDesktop";
import { HeroMobile } from "@/components/home/HeroMobile";
import { NFTCatalog } from "@/components/home/NFTCatalog";
import { Footer } from "@/components/layout/Footer";

// Organiza os destaques e o catálogo, escolhendo a composição adequada à largura.
export function Home() {
  return (
    <main className="px-6 pt-4 pb-[126px] md:px-0 md:pt-0">
      {/* Banner desktop. */}
      <HeroDesktop />

      {/* Banner mobile. */}
      <HeroMobile />

      {/* Catálogo compartilhado entre desktop e mobile. */}
      <NFTCatalog />
      {/* Rodapé previsto no frame Desktop / Início, alinhado à largura de 1200px.
          No mobile, a navegação continua sendo feita pela barra inferior. */}
      <div className="mx-auto mt-24 hidden w-full max-w-[1200px] pb-6 md:block">
        <Footer />
      </div>
    </main>
  );
}
