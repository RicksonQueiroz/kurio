import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { realtime, acceptCatalogEvent, type CatalogEvent } from "@/api/realtime";
import { useAuth } from "@/contexts/auth-store";
import { getSessionToken } from "./session-store";

/** A UI reconcilia o REST; não aplica preços recebidos diretamente ao estado visual. */
export function useRealtimeCatalog() {
  // client invalida consultas REST quando um evento novo exige reconciliar recursos.
  const client = useQueryClient();
  // user é a identidade autenticada; sua troca encerra os listeners e a conexão da sessão anterior.
  const { user } = useAuth();
  // userId participa das chaves privadas e da conferência de pertencimento dos eventos de pedido.
  const userId = user?.id;
  // connected informa se o socket está conectado; setConnected atualiza o feedback de disponibilidade.
  const [connected, setConnected] = useState(realtime.connected);
  // message descreve a última alteração ao vivo para anúncio acessível; setMessage publica esse aviso.
  const [message, setMessage] = useState("");
  // Registra os listeners da sessão atual, conecta o transporte e remove todos os listeners na limpeza.
  useEffect(() => {
    // versions guarda a última versão aceita de cada NFT para descartar duplicatas e eventos antigos.
    const versions = new Map<string, number>();
    // reconcile solicita novas respostas REST dos recursos ativos, mantendo a API como referência autoritativa.
    const reconcile = () => {
      void client.invalidateQueries({ queryKey: ["nfts"] });
      void client.invalidateQueries({ queryKey: ["cart"] });
      void client.invalidateQueries({ queryKey: ["order", userId] });
    };
    // receive processa um evento de NFT e só reconcilia e anuncia alterações quando a versão é nova.
    const receive = (event: CatalogEvent) => {
      if (acceptCatalogEvent(event, versions)) { reconcile(); setMessage("Preço ou disponibilidade atualizado. Confira sua seleção."); }
    };
    // snapshot recebe o conjunto de versões enviado na reconexão e agrupa sua invalidação em uma única reconciliação.
    const snapshot = (events: CatalogEvent[]) => {
      // changed registra se o snapshot contém algum recurso novo, evitando consultas repetidas para versões já conhecidas.
      let changed = false;
      if (Array.isArray(events)) /* event é cada versão recebida no snapshot; somente versões novas marcam a necessidade de reconciliação. */ for (const event of events) if (acceptCatalogEvent(event, versions)) changed = true;
      if (changed) reconcile();
    };
    // orderVersions controla versões de pedidos separadamente das versões de NFTs.
    const orderVersions = new Map<string, number>();
    // orderUpdated verifica a conta e a versão antes de atualizar consultas privadas de pedido e carrinho.
    const orderUpdated = (event: CatalogEvent & { userId: string }) => {
      if (userId && event?.userId === userId && acceptCatalogEvent(event, orderVersions)) {
        setMessage("Estado do pedido atualizado pela conexão ao vivo.");
        void client.invalidateQueries({ queryKey: ["order", userId, event.id] });
        void client.invalidateQueries({ queryKey: ["cart", userId] });
      }
    };
    // connect anuncia a conexão, apresenta o token ao mock e reconcilia os recursos depois da retomada.
    const connect = () => { setConnected(true); realtime.emit("session.subscribe", { token: getSessionToken() }); reconcile(); };
    // disconnect recebe o motivo, atualiza o estado visual e permite retomar uma desconexão simulada pelo servidor.
    const disconnect = (reason: string) => {
      setConnected(false);
      // Uma interrupção ordenada pelo cenário de teste também precisa permitir retomada.
      if (reason === "io server disconnect") realtime.connect();
    };
    realtime.on("nft.updated", receive); realtime.on("catalog.snapshot", snapshot);
    realtime.on("order.updated", orderUpdated);
    realtime.on("connect", connect); realtime.on("disconnect", disconnect);
    realtime.connect();
    return () => {
      realtime.off("nft.updated", receive); realtime.off("catalog.snapshot", snapshot);
      realtime.off("order.updated", orderUpdated);
      realtime.off("connect", connect); realtime.off("disconnect", disconnect);
      realtime.disconnect();
    };
  }, [client, userId]);
  return { connected, message };
}
