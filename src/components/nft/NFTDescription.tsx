import { useState } from "react";
import type { CatalogNFT } from "@/api/contracts";

// NFTDescription recebe o recurso consultado para exibir nome, rede e descrição da obra correta.
export function NFTDescription({ nft }: { nft: CatalogNFT }) {
  // Alterna entre as informações do NFT e suas avaliações.
  const [activeTab, setActiveTab] = useState<"details" | "reviews">("details");

  return (
    <section className="mt-16">
      {/* Abas presentes no Figma. */}
      <div className="flex gap-6 border-b border-[#D28A4C]/30">
        <button
          type="button"
          onClick={() => setActiveTab("details")}
          className={`pb-3 text-[14px] ${
            activeTab === "details"
              ? "border-b-2 border-[#D28A4C] font-bold text-[#E89B55]"
              : "text-[#F5F1EB]"
          }`}
        >
          Detalhes do NFT
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("reviews")}
          className={`pb-3 text-[14px] ${
            activeTab === "reviews"
              ? "border-b-2 border-[#D28A4C] font-bold text-[#E89B55]"
              : "text-[#F5F1EB]"
          }`}
        >
          Avaliações de colecionadores (19)
        </button>
      </div>

      {activeTab === "details" ? (
        <div className="mt-4 space-y-5 text-[13px] leading-6 text-[#CFB28C]">
          <p>
            {nft.name} #{nft.id} é uma obra digital finalizada à mão da coleção
            Kurio Editions. Cada atributo fica armazenado nos metadados do token
            e verificado na {nft.network}. A obra explora identidade, movimento e luz
            em um mundo digital sem fronteiras.
          </p>

          <p>
            A propriedade inclui a arte em alta resolução, lançamentos
            exclusivos para colecionadores e um registro permanente de
            procedência registrada na rede. Nova Sato recebe 5% de direitos
            autorais nas vendas secundárias, apoiando novos trabalhos e
            lançamentos da comunidade.
          </p>

          <div>
            <h3 className="font-bold text-[#F5F1EB]">Rede:</h3>
            <p>
              Cunhado na {nft.network} com procedência imutável e metadados
              armazenados no IPFS.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-[#F5F1EB]">Direitos autorais:</h3>
            <p>
              Direitos autorais do criador: 5% nas vendas secundárias, pagos
              automaticamente pelos mercados compatíveis.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-[#F5F1EB]">Contrato:</h3>
            <p>0x7A42...19E8 · Contrato inteligente ERC-721 verificado.</p>
          </div>
        </div>
      ) : (
        <div className="py-8 text-[13px] text-[#CFB28C]">
          As avaliações dos colecionadores serão carregadas aqui.
        </div>
      )}
    </section>
  );
}
