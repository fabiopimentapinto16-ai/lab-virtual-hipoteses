import type { Doenca, Ficha, Fonte, Hipotese } from "./types.ts";
import { DISCLAIMER_COMPLETO, violacoes } from "./textos.ts";
import { hashDoConteudo } from "./hipotese.ts";

const QUALIDADES = ["alta", "moderada", "baixa", "muito_baixa", "nao_declarada"];
const EVIDENCIAS = ["humano_meta_analise", "humano_ensaios", "humano_ensaio_unico", "mecanismo_em_revisao", "animal", "in_vitro", "historico"];

export function textosDe(v: unknown, acc: string[] = []): string[] {
  if (typeof v === "string") acc.push(v);
  else if (Array.isArray(v)) v.forEach((x) => textosDe(x, acc));
  else if (v && typeof v === "object") Object.values(v as Record<string, unknown>).forEach((x) => textosDe(x, acc));
  return acc;
}

export function validarFonte(f: Fonte): string[] {
  const e: string[] = [];
  if (!f.id || !f.citacao || !f.url || !f.o_que_a_fonte_diz || !f.lido_em) e.push(`fonte ${f.id}: campos obrigatórios ausentes`);
  if (f.url && !/^https:\/\//.test(f.url)) e.push(`fonte ${f.id}: url precisa ser https`);
  return e;
}

export function validarFicha(f: Ficha, fontes: Fonte[], doencas: Doenca[]): string[] {
  const e: string[] = [];
  const ids = new Set(fontes.map((x) => x.id));
  if (!f.fontes || f.fontes.length === 0) e.push(`${f.id}: ficha sem fonte (obrigatório)`);
  for (const s of f.fontes ?? []) if (!ids.has(s)) e.push(`${f.id}: fonte desconhecida ${s}`);
  if (!f.nome_cientifico) e.push(`${f.id}: nome científico ausente`);
  if (f.parte_usada && !f.parte_usada_fonte) e.push(`${f.id}: parte usada informada sem fonte`);
  if (!["avaliado", "parcial", "nao_avaliado"].includes(f.alertas_status)) e.push(`${f.id}: alertas_status inválido`);
  if (f.alertas_status === "avaliado" && f.alertas.length === 0) e.push(`${f.id}: marcada como avaliada mas sem alertas`);
  if (f.eixos.length === 0) e.push(`${f.id}: sem eixos`);
  for (const x of f.eixos) {
    const dz = doencas.find((d) => d.id === x.doenca);
    if (!dz) e.push(`${f.id}: doença desconhecida "${x.doenca}" em ${x.eixo}`);
    else if (!dz.eixos.some((d) => d.id === x.eixo)) e.push(`${f.id}: eixo desconhecido ${x.eixo} para ${x.doenca}`);
    if (!QUALIDADES.includes(x.qualidade)) e.push(`${f.id}: qualidade inválida em ${x.eixo}`);
    if (!EVIDENCIAS.includes(x.evidencia)) e.push(`${f.id}: evidência inválida em ${x.eixo}`);
    if (!x.fontes || x.fontes.length === 0) e.push(`${f.id}: eixo ${x.eixo} sem fonte`);
    for (const s of x.fontes ?? []) { if (!ids.has(s)) e.push(`${f.id}: fonte desconhecida ${s} em ${x.eixo}`); if (!f.fontes.includes(s)) e.push(`${f.id}: fonte ${s} do eixo ${x.eixo} não listada na ficha`); }
  }
  for (const c of f.compostos) if (c.id_publico && !/^\d+$/.test(c.id_publico.valor)) e.push(`${f.id}: ID público inválido em ${c.id}`);
  for (const t of textosDe(f)) for (const v of violacoes(t)) e.push(`${f.id}: linguagem proibida (${v}): "${t.slice(0, 60)}"`);
  return e;
}

export function validarDoenca(d: Doenca, fontes: Fonte[]): string[] {
  const e: string[] = [];
  const ids = new Set(fontes.map((x) => x.id));
  for (const n of d.nos) {
    if (n.fontes.length === 0) e.push(`nó ${n.id}: sem fonte`);
    for (const s of n.fontes) if (!ids.has(s)) e.push(`nó ${n.id}: fonte desconhecida ${s}`);
  }
  if (d.nos.length < 6 || d.nos.length > 12) e.push("o MVP pede de 6 a 12 nós de via");
  for (const o of d.orgaos) for (const id of o.nos) if (!d.nos.some((n) => n.id === id)) e.push(`órgão ${o.id}: nó desconhecido ${id}`);
  for (const x of d.eixos) for (const a of Array.isArray(x.alvo) ? x.alvo : [x.alvo]) {
    if (x.tipo === "mecanismo" && !d.nos.some((n) => n.id === a)) e.push(`eixo ${x.id}: alvo desconhecido ${a}`);
    if (x.tipo === "desfecho" && !d.derivados.some((i) => i.id === a)) e.push(`eixo ${x.id}: indicador desconhecido ${a}`);
  }
  const conhecidos = new Set(d.nos.map((n) => n.id));
  for (const dv of d.derivados) {
    for (const t of dv.termos ?? []) if (!conhecidos.has(t.de)) e.push(`derivado ${dv.id}: termo desconhecido ${t.de}`);
    if (dv.razao) for (const r of [dv.razao.num, dv.razao.den]) if (!conhecidos.has(r)) e.push(`derivado ${dv.id}: razão com variável desconhecida ${r}`);
    conhecidos.add(dv.id);
  }
  for (const o of d.orgaos) {
    const hs = new Set(o.hotspots.map((h) => h.id));
    if (o.modelo_real) {
      const mr = o.modelo_real;
      if (!/^[A-Za-z0-9_]+$/.test(mr.arquivo)) e.push(`órgão ${o.id}: nome de arquivo 3D inválido`);
      for (const h of Object.keys(mr.mapa)) { if (!hs.has(h)) e.push(`órgão ${o.id}: modelo_real mapeia hotspot desconhecido ${h}`); if (!mr.mapa[h].length) e.push(`órgão ${o.id}: mapa vazio para ${h}`); }
      if (mr.nuvem && !hs.has(mr.nuvem.hotspot)) e.push(`órgão ${o.id}: nuvem com hotspot desconhecido`);
      for (const h of o.hotspots) if (!(h.id in mr.mapa) && mr.nuvem?.hotspot !== h.id) e.push(`órgão ${o.id}: hotspot ${h.id} sem região no modelo real`);
    }
    for (const p of o.modelo3d) if (!hs.has(p.hotspot)) e.push(`órgão ${o.id}: parte 3D com hotspot desconhecido ${p.hotspot}`);
    for (const h of o.hotspots) if (!o.modelo3d.some((p) => p.hotspot === h.id)) e.push(`órgão ${o.id}: hotspot ${h.id} sem parte 3D`);
    for (const h of o.hotspots) for (const n of h.nos) if (!d.nos.some((x) => x.id === n)) e.push(`órgão ${o.id}: hotspot ${h.id} com nó desconhecido ${n}`);
    for (const el of o.celula_svg.elementos) if (!d.nos.some((x) => x.id === el.no)) e.push(`órgão ${o.id}: célula com nó desconhecido ${el.no}`);
  }
  for (const [a, b] of d.ligacoes_via) if (!d.nos.some((n) => n.id === a) || !d.nos.some((n) => n.id === b)) e.push(`ligação de via desconhecida ${a}-${b}`);
  for (const t of textosDe(d)) for (const v of violacoes(t)) e.push(`doença: linguagem proibida (${v}): "${t.slice(0, 60)}"`);
  return e;
}

export function validarHipotese(h: Hipotese): string[] {
  const e: string[] = [];
  if (h.schema_versao !== "1.1") e.push("schema_versao inesperada");
  if (!/^HYP-\d{4}-\d{3,}$/.test(h.id)) e.push("id fora do formato HYP-AAAA-NNN");
  if (h.disclaimer !== DISCLAIMER_COMPLETO) e.push("disclaimer diferente do texto exigido");
  if (h.fontes.length === 0) e.push("hipótese sem fontes");
  if (hashDoConteudo(h) !== h.hash_conteudo) e.push("hash do conteúdo não confere (conteúdo alterado)");
  for (const t of textosDe(h)) for (const v of violacoes(t)) e.push(`linguagem proibida (${v}): "${t.slice(0, 60)}"`);
  return e;
}
