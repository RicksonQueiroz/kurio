import { test } from "node:test";
import assert from "node:assert/strict";
import { addEth, subtractEth, multiplyEth, toWei, fromWei, formatEth, displayEth, isEth } from "../src/lib/money.ts";

// Casos que falham quando valores monetários são calculados com ponto flutuante.
test("ETH preserva precisão até um wei e totais do checkout", () => {
  assert.equal(addEth("0.1", "0.2"), "0.3");
  assert.equal(addEth("26.83", "0.016"), "26.846");
  assert.equal(multiplyEth("1.19", 3), "3.57");
  assert.equal(subtractEth("1", "0.999999999999999999"), "0.000000000000000001");
  assert.equal(fromWei(toWei("999999999999999.123456789012345678")), "999999999999999.123456789012345678");
});

// Cenário de regressão: arredondamento afeta somente a apresentação.
test("arredondamento afeta somente a apresentação", () => {
  assert.equal(formatEth("26.846", 3), "26.846");
  assert.equal(formatEth("1.995"), "2.00");
  assert.equal(formatEth("0.000000000000000001", 18), "0.000000000000000001");
  assert.equal(displayEth("0.119"), "0.119");
  assert.equal(displayEth("0.000000000000000001"), "0.000000000000000001");
  assert.equal(displayEth("1.1900"), "1.19");
});

// Cenário de regressão: rejeita valores e quantidades inválidos.
test("rejeita valores e quantidades inválidos", () => {
  // value é cada representação monetária inválida que a validação deve rejeitar sem converter silenciosamente.
  for (const value of ["-1", "1e3", "01", "NaN", "0.0000000000000000001", 1]) assert.equal(isEth(value), false);
  assert.throws(() => multiplyEth("1", 1.5));
  assert.throws(() => subtractEth("1", "2"));
});
