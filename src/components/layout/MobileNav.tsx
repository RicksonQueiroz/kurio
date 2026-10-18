import { Link } from "@tanstack/react-router";

// As propriedades informam a quantidade do carrinho e as ações de acesso à conta na barra mobile.
type MobileNavProps = {
  onLoginClick: () => void;
  accountLoading?: boolean;
};

// Mantém os acessos principais na barra inferior mobile.
export function MobileNav({ onLoginClick, accountLoading = false }: MobileNavProps) {
  return (
    // Contêiner fixo na parte inferior da tela.
    // No Figma, a Tab Bar mede 414 × 126px.
    <nav
      aria-label="Navegação inferior"
      className="fixed inset-x-0 bottom-0 z-50 h-[126px] overflow-visible md:hidden"
    >
      {/* Fundo original do Figma:
          ocupa a largura inteira e fica na parte inferior.
          A altura do vetor é de aproximadamente 95px. */}
      {/* Fundo original do Figma.
    Ocupa toda a largura da Tab Bar e mantém
    a proporção vertical definida no design. */}
      {/* Fundo original exportado do Figma.
    O SVG possui viewBox de 414 × 135px.
    Preservamos sua proporção e o recorte central. */}
      <img
        src="/icons/TabBarBackground.svg"
        alt=""
        aria-hidden="true"
        className="
    absolute bottom-0 left-0
    h-[135px] w-full
  "
      />
      {/* Navegação distribuída em cinco posições.
          Os ícones laterais ficam sobre o fundo da barra. */}
      <div className="absolute inset-x-0 bottom-0 flex h-[95px] items-center justify-around px-6">
        {/* Início: rota já existente na aplicação. */}
        <Link
          to="/"
          aria-label="Início"
          className="flex h-11 w-11 items-center justify-center"
        >
          <img
            src="/icons/Home.svg"
            alt=""
            aria-hidden="true"
            className="h-6 w-6"
          />
        </Link>

        {/* Favoritos: ícone visual.
            A rota será conectada quando implementarmos essa funcionalidade. */}
        <Link
          to="/favorites"
          aria-label="Favoritos"
          className="flex h-11 w-11 items-center justify-center"
        >
          <img
            src="/icons/favorites.svg"
            alt=""
            aria-hidden="true"
            className="h-6 w-6"
          />
        </Link>

        {/* Espaço reservado para o botão central elevado.
            Evita que os demais ícones ocupem sua posição. */}
        <div className="h-[65px] w-[65px] shrink-0" aria-hidden="true" />

        {/* Carrinho: abre a rota existente. */}
        <Link
          to="/cart"
          aria-label="Carrinho"
          className="flex h-11 w-11 items-center justify-center"
        >
          <img
            src="/icons/Shop.svg"
            alt=""
            aria-hidden="true"
            className="h-6 w-6"
          />
        </Link>

        {/* Perfil: abre o modal compartilhado de autenticação. */}
        <button
          type="button"
          onClick={onLoginClick}
          disabled={accountLoading}
          aria-busy={accountLoading}
          aria-label="Perfil"
          className="flex h-11 w-11 items-center justify-center"
        >
          <img
            src="/icons/User.svg"
            alt=""
            aria-hidden="true"
            className="h-6 w-6"
          />
        </button>
      </div>

      {/* Botão central:
          círculo de 65 × 65px, centralizado horizontalmente.
          O posicionamento vertical será validado visualmente. */}
      <button
        type="button"
        aria-label="Ação principal"
        className="
          absolute left-1/2 top-0
          flex h-[65px] w-[65px]
          -translate-x-1/2
          cursor-pointer items-center justify-center
          rounded-full
          bg-linear-to-b from-[#D28A4C]/40 to-[#D28A4C]
        "
      >
        {/* Símbolo personalizado exportado do Figma. */}
        <img
          src="/icons/CentralButtonIcon.svg"
          alt=""
          aria-hidden="true"
          className="h-7 w-7"
        />
      </button>
    </nav>
  );
}
