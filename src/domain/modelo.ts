import type { Doenca, FaixaIncerteza, Match, NivelConfianca, ResultadoSimulacao, Valores } from "./types.ts";
import { mulberry32 } from "./rng.ts";

const clip = (x: number, a = 0, b = 100) => Math.max(a, Math.min(b, x));
const r2 = (x: number) => Math.round(x * 100) / 100;

export function estadoNos(d: Doenca, perfil: "saudavel" | "doenca"): Valores {
  const o: Valores = {};
  for (const n of d.nos) o[n.id] = perfil === "saudavel" ? n.saudavel : n.doenca;
  return o;
}

function calcular(d: Doenca, nos: Valores, ref: Valores | null): Valores {
  const v: Valores = { ...nos };
  for (const dv of d.derivados) {
    let x: number;
    if (dv.razao) x = (dv.razao.mult * v[dv.razao.num]) / Math.max(v[dv.razao.den], 1);
    else {
      x = dv.base ?? 0;
      for (const t of dv.termos ?? []) {
        const val = v[t.de];
        if (t.modo === "valor") x += t.peso * val;
        else if (t.modo === "inverso") x += t.peso * (100 - val);
        else x += t.peso * (val - (ref ? ref[t.de] : val));
      }
      if (dv.limitar) x = clip(x);
    }
    v[dv.id] = x;
  }
  return v;
}

/** Calcula as variáveis derivadas a partir dos nós, conforme `doenca.derivados` (relações lineares e auditáveis). */
export function derivar(d: Doenca, nos: Valores): Valores {
  const ref = calcular(d, estadoNos(d, "saudavel"), null);
  const v = calcular(d, nos, ref);
  const out: Valores = {};
  for (const [k, x] of Object.entries(v)) out[k] = r2(x);
  return out;
}

/** Nomes legíveis de todas as variáveis (nós e derivados). */
export function nomeVariavel(d: Doenca, id: string): string {
  return d.nos.find((n) => n.id === id)?.nome ?? d.derivados.find((x) => x.id === id)?.nome ?? d.lacunas.find((x) => x.id === id)?.nome ?? id;
}
/** Variáveis exibidas em tabelas: todos os nós e os derivados marcados `exibir`. */
export function variaveisExibidas(d: Doenca): { id: string; nome: string; tipo: "no" | "derivado" }[] {
  return [
    ...d.nos.map((n) => ({ id: n.id, nome: n.nome, tipo: "no" as const })),
    ...d.derivados.filter((x) => x.exibir).map((x) => ({ id: x.id, nome: x.nome, tipo: "derivado" as const })),
  ];
}

function alvos(a: string | string[]): string[] { return Array.isArray(a) ? a : [a]; }

/** Aplica efeitos (delta já combinado por eixo). Mecanismo muda nós; desfecho muda só os índices derivados. */
export function aplicarEfeitos(d: Doenca, nosAntes: Valores, efeitos: Map<string, number>): Valores {
  const lim = d.equacoes.limite_delta_por_variavel;
  const accNos: Record<string, number> = {};
  const accDesf: Record<string, number> = {};
  for (const [eixoId, delta] of efeitos) {
    const e = d.eixos.find((x) => x.id === eixoId);
    if (!e) continue;
    for (const alvo of alvos(e.alvo)) {
      const acc = e.tipo === "mecanismo" ? accNos : accDesf;
      acc[alvo] = (acc[alvo] ?? 0) + delta;
    }
  }
  const nos: Valores = { ...nosAntes };
  for (const [k, v] of Object.entries(accNos)) nos[k] = clip(nos[k] + Math.max(-lim, Math.min(lim, v)));
  const der = derivar(d, nos);
  for (const [k, v] of Object.entries(accDesf)) der[k] = r2(clip(der[k] + Math.max(-lim, Math.min(lim, v))));
  return der;
}

interface Termo { eixo: string; base: number; nivel: NivelConfianca; item: string }

function termos(d: Doenca, matches: Match[]): Termo[] {
  const lista: Termo[] = [];
  const ordenados = [...matches].sort((a, b) => (a.ficha_id + a.eixo).localeCompare(b.ficha_id + b.eixo));
  for (const m of ordenados) {
    const e = d.eixos.find((x) => x.id === m.eixo);
    if (e) lista.push({ eixo: m.eixo, base: e.delta, nivel: m.nivel, item: m.ficha_id });
  }
  return lista;
}

/** Mesmo eixo vindo de vários itens: maior efeito + 25% da soma dos demais (retorno decrescente). */
function combinar(valores: number[]): number {
  if (valores.length === 0) return 0;
  const ord = [...valores].sort((a, b) => Math.abs(b) - Math.abs(a));
  return ord[0] + 0.25 * ord.slice(1).reduce((s, v) => s + v, 0);
}

function efeitosDe(t: Termo[], mult: (x: Termo) => number, fator: Record<NivelConfianca, number>): Map<string, number> {
  const porEixo = new Map<string, number[]>();
  for (const x of t) {
    const arr = porEixo.get(x.eixo) ?? [];
    arr.push(x.base * fator[x.nivel] * mult(x));
    porEixo.set(x.eixo, arr);
  }
  const out = new Map<string, number>();
  for (const [k, v] of porEixo) out.set(k, combinar(v));
  return out;
}

function percentil(sorted: number[], p: number): number {
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(p * (sorted.length - 1))))];
}

/** Simulação leve e determinística. A seed só controla a faixa de incerteza (amostras do efeito conforme a confiança). */
export function simular(d: Doenca, matches: Match[], seed: number): ResultadoSimulacao {
  const cfg = d.simulacao;
  const antesNos = estadoNos(d, "doenca");
  const antes = derivar(d, antesNos);
  const t = termos(d, matches);
  const nominal = efeitosDe(t, () => 1, cfg.fator_confianca);
  const depois = aplicarEfeitos(d, antesNos, nominal);
  const deltas: Valores = {};
  for (const k of Object.keys(antes)) deltas[k] = r2(depois[k] - antes[k]);

  const rnd = mulberry32(seed);
  const chaves = d.derivados.filter((x) => x.incerteza).map((x) => x.id);
  const amostras: Record<string, number[]> = Object.fromEntries(chaves.map((k) => [k, []]));
  for (let i = 0; i < cfg.amostras_incerteza; i++) {
    const sorteio = new Map<Termo, number>();
    for (const x of t) { const [lo, hi] = cfg.incerteza[x.nivel]; sorteio.set(x, lo + (hi - lo) * rnd()); }
    const dep = aplicarEfeitos(d, antesNos, efeitosDe(t, (x) => sorteio.get(x) ?? 1, cfg.fator_confianca));
    for (const k of chaves) amostras[k].push(dep[k] - antes[k]);
  }
  const incerteza: Record<string, FaixaIncerteza> = {};
  for (const k of chaves) {
    const s = amostras[k].sort((a, b) => a - b);
    incerteza[k] = { p10: r2(percentil(s, 0.1)), p50: r2(percentil(s, 0.5)), p90: r2(percentil(s, 0.9)) };
  }
  const efeitos_aplicados = [...nominal.entries()].map(([eixo, delta]) => ({
    eixo, delta: r2(delta), itens: [...new Set(t.filter((x) => x.eixo === eixo).map((x) => x.item))],
  }));
  return { seed, antes, depois, deltas, incerteza, efeitos_aplicados };
}
