import { test } from "node:test";
import assert from "node:assert/strict";
import { catalogSearch } from "../src/lib/catalogSearch.ts";

// Cenário de regressão: URL de catálogo normaliza entradas externas sem perder precisão monetária.
test("URL de catálogo normaliza entradas externas sem perder precisão monetária", () => {
  // parsed é o resultado normalizado de entradas válidas da URL, incluindo um preço com precisão de um wei.
  const parsed = catalogSearch({ q: "  Emerald  ", page: "2", maxPrice: "1.000000000000000001", network: "Ethereum", sort: "price-asc" });
  assert.equal(parsed.q, "Emerald");
  assert.equal(parsed.page, 2);
  assert.equal(parsed.maxPrice, "1.000000000000000001");
  assert.equal(parsed.sort, "price-asc");
});

// Cenário de regressão: parâmetros inválidos não propagam página negativa, rede inexistente ou preço exponencial.
test("parâmetros inválidos não propagam página negativa, rede inexistente ou preço exponencial", () => {
  // parsed é o resultado da normalização de entradas inválidas, que não devem alcançar a consulta como filtros válidos.
  const parsed = catalogSearch({ q: [], page: -4, maxPrice: "1e-3", network: "Outra", sort: "inválida" });
  assert.equal(parsed.q, undefined);
  assert.equal(parsed.page, 1);
  assert.equal(parsed.maxPrice, undefined);
  assert.equal(parsed.network, undefined);
  assert.equal(parsed.sort, undefined);
});
