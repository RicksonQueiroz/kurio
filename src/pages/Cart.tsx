import { CartMobile } from "@/components/cart/CartMobile";
import { CartDesktop } from "@/components/cart/CartDesktop";
import { CartFeedback } from "@/components/cart/CartFeedback";
import { useCart } from "@/contexts/cart-store";

// Escolhe o layout do carrinho e apresenta os estados de carregamento e falha.
export function Cart() {
  // isLoading e error definem o estado da página; items permite conservar dados já carregados durante uma falha.
  const { isLoading, error, items } = useCart();
  // O shimmer ocupa a área dos itens e do resumo enquanto a API recupera a cotação.
  if (isLoading) return <main className="mx-auto grid min-h-[550px] max-w-[1200px] gap-8 p-6 md:grid-cols-[2fr_1fr]" role="status" aria-label="Carregando carrinho">
    <div className="flex flex-col gap-4">{[0, 1, 2].map(index => <div key={index} className="catalog-skeleton h-[90px] rounded-[14px]" />)}</div>
    <div className="catalog-skeleton h-[350px] rounded-[30px]" />
  </main>;
  if (error && !items.length) return <main><CartFeedback /></main>;
  return (
    <main className="mx-auto w-full max-w-[1200px] text-[#F5F1EB]">
      <CartFeedback />
      {/* Carrinho mobile: visível em telas menores que 768px. */}
      <div className="md:hidden">
        <CartMobile />
      </div>

      {/* Carrinho desktop: visível a partir de 768px. */}
      <div className="hidden px-6 py-10 md:block">
        <CartDesktop />
      </div>
    </main>
  );
}
