import { test } from "node:test";
import assert from "node:assert/strict";
import { acceptCatalogEvent } from "../src/lib/eventVersion.ts";

// Cenário de regressão: eventos não regridem versões nem confundem recursos distintos.
test("eventos não regridem versões nem confundem recursos distintos", () => {
  // versions registra a maior versão aceita de cada recurso durante a sequência de eventos do teste.
  const versions = new Map<string, number>();
  // event é a versão inicial conhecida da obra, reutilizada para simular duplicatas e versões antigas.
  const event = { eventId: "a", id: "042", version: 3 };
  assert.equal(acceptCatalogEvent(event, versions), true);
  assert.equal(acceptCatalogEvent(event, versions), false);
  assert.equal(acceptCatalogEvent({ ...event, eventId: "old", version: 2 }, versions), false);
  assert.equal(acceptCatalogEvent({ ...event, id: "009", version: 1 }, versions), true);
  assert.equal(versions.get("042"), 3);
});
