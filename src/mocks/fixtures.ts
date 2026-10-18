import { nfts } from "../data/nfts.ts";
import type { CatalogNFT, Network } from "../api/contracts.ts";

// collections distribui as fixtures entre coleções para permitir combinar filtros.
const collections = ["Arte digital", "Fotografia", "Música", "Arte 3D", "Colecionáveis", "Generativa", "Jogos", "Assinaturas", "Utilidade"];
// networks distribui as fixtures entre redes para permitir testar filtros de rede.
const networks: Network[] = ["Ethereum", "Polygon", "Solana"];

/** Fixtures fixas: mesma ordem, datas e preços em desenvolvimento e nos testes. */
export function createCatalog(): CatalogNFT[] {
  // seed reúne os NFTs da referência que servem de base ao catálogo determinístico.
  const seed = [...nfts, { id: "971", name: "Golden Frequency", price: "8.59", image: "/images/nfts/golden-beat.webp" }];
  // additional gera variações fixas dos NFTs para que existam várias páginas de resultados.
  const additional = Array.from({ length: 23 }, (_, index) => ({
    ...seed[index % seed.length], id: String(5000 + index), name: `${seed[index % seed.length].name} Edition ${index + 1}`,
  }));
  return [...seed, ...additional].map((nft, index) => ({
    ...nft,
    collection: collections[index % collections.length],
    network: networks[index % networks.length],
    createdAt: new Date(Date.UTC(2026, 6, 29) - index * 86_400_000).toISOString(),
    popularity: (index * 17) % 100,
    version: 1,
    editions: [
      { edition: "1/1", available: index === 9 ? 0 : 1 },
      { edition: "1/10", available: 10 },
      { edition: "1/50", available: 50 },
      { edition: "ABERTA", available: 100 },
    ],
  }));
}
