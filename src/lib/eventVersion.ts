/** Versões por recurso impedem aplicar novamente eventos duplicados ou antigos. */
export function acceptCatalogEvent(event: { eventId: string; id: string; version: number }, versions: Map<string, number>) {
  if (!event || typeof event.id !== "string" || typeof event.eventId !== "string" || !Number.isSafeInteger(event.version) || event.version <= (versions.get(event.id) ?? 0)) return false;
  versions.set(event.id, event.version);
  return true;
}
