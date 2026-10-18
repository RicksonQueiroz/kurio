import { useState } from "react";

import type { CatalogNFT } from "@/api/contracts";
import { NFTDetailsDesktop } from "@/components/nft/NFTDetailsDesktop";
import { NFTDetailsMobile } from "@/components/nft/NFTDetailsMobile";
import { NFTDescription } from "@/components/nft/NFTDescription";
import { RelatedNFTs } from "@/components/nft/RelatedNFTs";
import { Footer } from "@/components/layout/Footer";
import { CartFeedback } from "@/components/cart/CartFeedback";

// Hook responsável pelas operações do carrinho.
import { useCart } from "@/contexts/cart-store";
import { useAuth } from "@/contexts/auth-store";
import { AuthModal } from "@/components/auth/AuthModal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { accountApi, favoritesQuery } from "@/api/account";
import { apiErrorMessage } from "@/api/http";

// Dados recebidos da rota de detalhes.
type NFTDetailsProps = {
  nft: CatalogNFT;
};

// NFTDetails recebe o NFT consultado e compartilha seleção, estoque e ações entre os layouts.
export function NFTDetails({ nft }: NFTDetailsProps) {
  // Estado de favorito compartilhado entre desktop e mobile.
  const { user } = useAuth();
  // client permite invalidar a lista privada de favoritos depois da escrita confirmada.
  const client = useQueryClient();
  // favorites consulta a lista somente quando existe uma conta autenticada.
  const favorites = useQuery({ ...favoritesQuery(user?.id ?? "guest"), enabled: !!user });
  // favoriteMutation inclui ou remove o favorito pela API, sem retry automático, e reconcilia a lista ao concluir.
  const favoriteMutation = useMutation({ mutationFn: accountApi.favorite, retry: false, onSuccess: () => client.invalidateQueries({ queryKey: ["favorites", user?.id] }) });
  // isFavorite indica se o identificador da obra aparece na lista confirmada da conta.
  const isFavorite = favorites.data?.ids.includes(nft.id) ?? false;
  // authOpen controla o diálogo de entrada para visitantes que tentam favoritar; setAuthOpen abre e fecha essa camada.
  const [authOpen, setAuthOpen] = useState(false);

  // Edição inicialmente selecionada, conforme o Figma.
  const [selectedEdition, setSelectedEdition] = useState("1/50");

  // Quantidade inicialmente selecionada.
  const [quantity, setQuantity] = useState(1);
  // O asset original possui uma imagem; as miniaturas oferecem recortes da mesma obra.
  const [galleryView, setGalleryView] = useState(0);

  // Obtém a função que adiciona NFTs ao carrinho.
  const { addToCart, isPending, isLoading } = useCart();
  // availability indexa o estoque por nome de edição para consultar cada opção sem repetir a busca.
  const availability = Object.fromEntries(nft.editions.map(edition => [edition.edition, edition.available]));
  // available é o estoque da edição selecionada, usado para limitar quantidade e compra.
  const available = availability[selectedEdition] ?? 0;

  // Alterna o estado do favorito.
  function toggleFavorite() {
    if (!user) { setAuthOpen(true); return; }
    if (!favoriteMutation.isPending && !favorites.isPending && !favorites.isError) favoriteMutation.mutate({ id: nft.id, selected: !isFavorite });
  }

  // Diminui a quantidade, respeitando o mínimo de uma unidade.
  function decreaseQuantity() {
    setQuantity((current) => Math.max(1, current - 1));
  }

  // Aumenta a quantidade selecionada.
  function increaseQuantity() {
    setQuantity((current) => Math.min(available, current + 1));
  }

  // Adiciona ao carrinho o NFT e a quantidade selecionada.
  function handleAddToCart() {
    if (!isPending && !isLoading && quantity <= available) addToCart(nft, quantity, selectedEdition);
  }

  // Reúne as propriedades utilizadas pelos dois layouts.
  const detailsProps = {
    nft,
    isFavorite,
    galleryView, onGalleryView: setGalleryView,
    isUpdatingFavorite: !!user && (favorites.isPending || favoriteMutation.isPending),
    selectedEdition,
    quantity,
    available,
    availability,
    isAdding: isPending || isLoading,
    onToggleFavorite: toggleFavorite,
    onSelectEdition: (edition: string) => { setSelectedEdition(edition); setQuantity(1); },
    onDecreaseQuantity: decreaseQuantity,
    onIncreaseQuantity: increaseQuantity,

    // Compartilha a ação de adicionar ao carrinho.
    onAddToCart: handleAddToCart,
  };

  return (
    <main className="mx-auto w-full max-w-[1200px] px-0 pb-0 md:px-6 md:pb-20 xl:px-0">
      <CartFeedback />
      {favoriteMutation.isPending && <p role="status" className="p-4 text-[#CFB28C]">Atualizando favoritos…</p>}
      {(favoriteMutation.error || favorites.error) && <div role="alert" className="p-4 text-[#CFB28C]">{apiErrorMessage(favoriteMutation.error ?? favorites.error)}<button className="ml-3 underline" onClick={() => void favorites.refetch()}>Consultar favoritos novamente</button></div>}
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} onAuthenticated={() => setAuthOpen(false)} />}
      {/* Layout exclusivo para telas menores que 768px. */}
      <div className="md:hidden">
        <NFTDetailsMobile {...detailsProps} />
      </div>

      {/* Layout desktop, preservando a estrutura já construída. */}
      <div className="hidden md:block">
        <NFTDetailsDesktop {...detailsProps} />

        {/* Seções complementares da versão desktop. */}
        <NFTDescription nft={nft} />
        <RelatedNFTs currentNftId={nft.id} />
        {/* Rodapé do frame desktop, após as recomendações da coleção.
            Fica dentro deste layout para não aparecer nos detalhes mobile. */}
        <div className="mt-24">
          <Footer />
        </div>
      </div>
    </main>
  );
}
