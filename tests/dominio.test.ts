import test from "node:test";
import assert from "node:assert/strict";
import { DOENCAS, FICHAS, FONTES } from "../src/domain/dados.ts";
import { validarDoenca, validarFicha, validarFonte, validarHipotese, textosDe } from "../src/domain/validar.ts";
import { fazerMatches } from "../src/domain/match.ts";
import { criarHipotese, proximoId, registrarEvento, hashDoConteudo } from "../src/domain/hipotese.ts";
import { derivar, estadoNos } from "../src/domain/modelo.ts";
import { sha256Hex } from "../src/domain/sha256.ts";
import { DISCLAIMER_COMPLETO, violacoes } from "../src/domain/textos.ts";
import { readFileSync as lerArq } from "node:fs";

const d = DOENCAS[0];
const f = (id: string) => FICHAS.find((x) => x.id === id)!;
const nivel = (id: string, eixo: string) => fazerMatches(d, [f(id)]).find((m) => m.eixo === eixo)?.nivel;

test("fontes válidas", () => { for (const s of FONTES) assert.deepEqual(validarFonte(s), []); });
test("doença válida", () => assert.deepEqual(validarDoenca(d, FONTES), []));
test("fichas válidas e com fonte", () => { assert.ok(FICHAS.length >= 5); for (const x of FICHAS) assert.deepEqual(validarFicha(x, FONTES, DOENCAS), []); });
test("dados sem linguagem proibida", () => { for (const t of textosDe([d, FICHAS])) assert.deepEqual(violacoes(t), [], t); });
test("sha256 vetores conhecidos", () => {
  assert.equal(sha256Hex(""), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  assert.equal(sha256Hex("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
});
test("estado doente tem índices piores que o saudável", () => {
  const s = derivar(d, estadoNos(d, "saudavel")), x = derivar(d, estadoNos(d, "doenca"));
  assert.ok(x.gj > s.gj && x.gp > s.gp && x.razao_ri_beta > s.razao_ri_beta);
});
test("confiança esperada", () => {
  assert.equal(nivel("berberina", "glicemia_jejum"), "medio");
  assert.equal(nivel("berberina", "inflamacao"), "fraco");
  assert.equal(nivel("curcuma", "glicemia_jejum"), "medio");
  assert.equal(nivel("curcuma", "estresse_oxidativo"), "fraco");
  // canela passou de "fraco" para "medio" quando a ficha ganhou avaliação parcial de segurança (cumarina, f_jafari2025): o teto de "sem avaliação" deixou de valer.
  assert.equal(nivel("canela", "glicemia_jejum"), "medio");
  assert.equal(nivel("feno_grego", "glicemia_jejum"), "medio");
  for (const x of FICHAS) for (const m of fazerMatches(d, [x])) assert.notEqual(m.nivel, "forte");
});
test("hipótese determinística e íntegra", () => {
  const mk = (seed: number) => criarHipotese({ doenca: d, fichas: [f("berberina")], fontes: FONTES, seed, id: "HYP-2026-001", data: "2026-11-12" });
  const a = mk(42), b = mk(42), c = mk(7);
  assert.deepEqual(a, b);
  assert.equal(a.hash_conteudo, hashDoConteudo(a));
  assert.deepEqual(validarHipotese(a), []);
  assert.equal(a.disclaimer, DISCLAIMER_COMPLETO);
  assert.ok(a.simulacao.depois.gj < a.simulacao.antes.gj);
  assert.notDeepEqual(a.simulacao.incerteza, c.simulacao.incerteza);
  assert.deepEqual(a.simulacao.depois, c.simulacao.depois);
  assert.ok(a.pergunta_para_lab.length > 20 && !/\d+\s?(mg|g|ml)/i.test(a.pergunta_para_lab));
});
test("adulterar quebra o hash", () => {
  const a = criarHipotese({ doenca: d, fichas: [f("curcuma")], fontes: FONTES, seed: 1, id: "HYP-2026-002", data: "2026-11-12" });
  const t = structuredClone(a); t.simulacao.depois.gj = 1;
  assert.ok(validarHipotese(t).some((e) => e.includes("hash")));
});
test("ids e linha do tempo", () => {
  assert.equal(proximoId(2026, []), "HYP-2026-001");
  assert.equal(proximoId(2026, ["HYP-2026-001", "HYP-2026-009", "HYP-2025-050"]), "HYP-2026-010");
  const a = criarHipotese({ doenca: d, fichas: [f("galega")], fontes: FONTES, seed: 1, id: "HYP-2026-003", data: "2026-11-12" });
  assert.throws(() => registrarEvento(a, "lab_testou", "2026-11-13"));
  const b = registrarEvento(a, "publicada", "2026-11-13");
  assert.equal(b.hash_conteudo, hashDoConteudo(b));
  assert.equal(b.linha_do_tempo.length, 2);
});
test("combinação no mesmo eixo tem retorno decrescente", () => {
  const um = criarHipotese({ doenca: d, fichas: [f("berberina")], fontes: FONTES, seed: 1, id: "HYP-2026-004", data: "2026-11-12" });
  const dois = criarHipotese({ doenca: d, fichas: [f("berberina"), f("feno_grego")], fontes: FONTES, seed: 1, id: "HYP-2026-005", data: "2026-11-12" });
  const g1 = um.simulacao.deltas.gj, g2 = dois.simulacao.deltas.gj;
  assert.ok(g2 <= g1 && g2 > 2 * g1);
});

import { readFileSync, readdirSync } from "node:fs";
test("textos da interface sem linguagem proibida", () => {
  const arqs = ["index.html", "src/main.ts", ...readdirSync("src/ui").filter((x) => x.endsWith(".ts")).map((x) => "src/ui/" + x), "src/export/pdf.ts"];
  for (const a of arqs) readFileSync(a, "utf8").split("\n").forEach((l, i) => assert.deepEqual(violacoes(l), [], `${a}:${i + 1}: ${l.trim()}`));
});

test("regressão: diabetes dá os mesmos números do motor anterior", () => {
  const base = JSON.parse(lerArq("tests/fixtures/t2d_baseline.json", "utf8"));
  const h = criarHipotese({ doenca: d, fichas: base.itens.map((i: string) => f(i)), fontes: FONTES, seed: base.seed, id: "HYP-2026-001", data: "2026-11-12" });
  assert.deepEqual(h.simulacao, base.simulacao);
  assert.deepEqual(h.matches.map((m) => [m.ficha_id, m.eixo, m.nivel, m.score]), base.niveis);
});
test("toda doença tem modelo coerente e estados saudável/doença distintos", () => {
  for (const x of DOENCAS) {
    assert.deepEqual(validarDoenca(x, FONTES), [], x.id);
    const s = derivar(x, estadoNos(x, "saudavel")), z = derivar(x, estadoNos(x, "doenca"));
    for (const dv of x.derivados.filter((v) => v.exibir && !v.razao)) assert.ok(z[dv.id] > s[dv.id], `${x.id}/${dv.id}`);
  }
});

test("hipertensão: níveis esperados e evidência por doença", () => {
  const nh = (id: string, eixo: string) => fazerMatches(DOENCAS[1], [f(id)]).find((m) => m.eixo === eixo)?.nivel;
  assert.equal(nh("canela", "pressao_arterial"), "fraco"); // qualidade muito baixa limita a fraco
  assert.equal(nh("alho", "pressao_arterial"), "fraco"); // segurança não avaliada limita a fraco
  assert.equal(nh("hibisco", "pressao_arterial"), "medio");
  assert.equal(nh("hibisco", "ativacao_raas"), "fraco");
  assert.equal(fazerMatches(DOENCAS[1], [f("berberina")]).length, 0); // evidência de diabetes não transfere
  const mc = fazerMatches(DOENCAS[2], FICHAS); // câncer: só curcumina, só pré-clínico
  assert.deepEqual([...new Set(mc.map((m) => m.ficha_id))], ["curcuma"]);
  assert.ok(mc.every((m) => m.nivel === "fraco"));
});
