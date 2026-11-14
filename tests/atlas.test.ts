import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, statSync } from "node:fs";
import { ATLAS, nomeEstrutura } from "../src/domain/atlas.ts";
import { DOENCAS, FONTES } from "../src/domain/dados.ts";
import { validarDoenca } from "../src/domain/validar.ts";

test("todo arquivo do atlas existe e é GLB válido", () => {
  for (const o of ATLAS) for (const a of o.arquivos) {
    const p = `public/modelos/${a}.glb`;
    assert.ok(existsSync(p), p);
    const b = readFileSync(p);
    assert.equal(b.subarray(0, 4).toString("latin1"), "glTF", p);
    assert.ok(statSync(p).size > 1000, p);
  }
});
test("ids do atlas únicos e vínculos apontam para órgãos existentes", () => {
  assert.equal(new Set(ATLAS.map((o) => o.id)).size, ATLAS.length);
  for (const o of ATLAS) if (o.vinculo) {
    const d = DOENCAS.find((x) => x.id === o.vinculo!.doenca); assert.ok(d, o.id);
    const org = d!.orgaos.find((x) => x.id === o.vinculo!.orgao); assert.ok(org?.modelo_real, o.id);
    assert.ok(o.arquivos.includes(org!.modelo_real!.arquivo), o.id);
  }
});
test("mapa de modelo_real cobre cada hotspot e bate com nomes reais de meshes do GLB", () => {
  for (const d of DOENCAS) {
    assert.deepEqual(validarDoenca(d, FONTES), [], d.id);
    for (const o of d.orgaos) if (o.modelo_real) {
      const b = readFileSync(`public/modelos/${o.modelo_real.arquivo}.glb`);
      const j = JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString("utf8"));
      const nomes: string[] = j.meshes.map((m: { name: string }) => m.name.toLowerCase());
      for (const [h, pads] of Object.entries(o.modelo_real.mapa)) for (const p of pads) assert.ok(nomes.some((n) => n.includes(p.toLowerCase())), `${o.id}/${h}/${p}`);
      for (const p of o.modelo_real.nuvem?.de ?? []) assert.ok(nomes.some((n) => n.includes(p.toLowerCase())), `${o.id}/nuvem/${p}`);
    }
  }
});
test("nomeEstrutura remove prefixo do arquivo", () => {
  assert.equal(nomeEstrutura("VH_M_head_of_pancreas"), "head of pancreas");
});
