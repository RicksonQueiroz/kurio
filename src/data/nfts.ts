import type { NFT } from "@/api/contracts";
export type { NFT } from "@/api/contracts";

// Dados iniciais baseados nos NFTs visíveis no Figma.
// Imagens repetidas são reutilizadas, sem duplicar arquivos.
export const nfts: NFT[] = [
  {
    id: "042",
    name: "Emerald Ape",
    price: "1.19",
    image: "/images/nfts/emerald-ape.webp",
  },
  {
    id: "009",
    name: "Sage Nomad",
    price: "1.69",
    image: "/images/nfts/sage-nomad.webp",
  },
  {
    id: "552",
    name: "Neon Vessel",
    price: "1.99",
    image: "/images/nfts/neon-vessel.webp",
  },
  {
    id: "118",
    name: "Cosmic Bloom",
    price: "1.29",
    image: "/images/nfts/sage-nomad.webp",
  },
  {
    id: "314",
    name: "Violet Nomad",
    price: "1.39",
    image: "/images/nfts/sage-nomad.webp",
  },
  {
    id: "088",
    name: "Ivory Baron",
    price: "1.79",
    image: "/images/nfts/neon-vessel.webp",
  },
  {
    id: "207",
    name: "Golden Beat",
    price: "0.99",
    image: "/images/nfts/golden-beat.webp",
  },
  {
    id: "160",
    name: "Golden Signal",
    price: "0.39",
    image: "/images/nfts/golden-beat.webp",
  },
];
