import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DOENCAS, FICHAS, FONTES } from "../src/domain/dados.ts";
import { criarHipotese } from "../src/domain/hipotese.ts";
import { gerarPDF, sanitizar } from "../src/export/pdf.ts";
import { gerarJSON } from "../src/export/json.ts";

const h = criarHipotese({ doenca: DOENCAS[0], fichas: [FICHAS[0], FICHAS[4]], fontes: FONTES, seed: 42, id: "HYP-2026-001", data: "2026-11-12" });

test("sanitizar remove caracteres fora de WinAnsi", () => { assert.equal(sanitizar("a → b ≥ Δ"), "a -> b >= delta "); });
test("PDF é gerado e não-trivial", async () => {
  const b = await gerarPDF(h);
  assert.equal(Buffer.from(b.slice(0, 5)).toString(), "%PDF-");
  assert.ok(b.length > 3000);
});
test("JSON round-trip e schema (se ajv disponível)", async () => {
  const j = JSON.parse(gerarJSON(h));
  assert.deepEqual(j, JSON.parse(JSON.stringify(h)));
  let Ajv: any;
  try { Ajv = (await import("ajv")).default; } catch { return; }
  const ajv = new Ajv({ allErrors: true, strict: false });
  const v = ajv.compile(JSON.parse(readFileSync("schemas/hipotese.schema.json", "utf8")));
  assert.ok(v(j), JSON.stringify(v.errors));
});
