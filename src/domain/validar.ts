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

export function validarFicha(f: Ficha, fontes: Fonte[], doenca: Doenca): string[] {
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
    if (!doenca.eixos.some((d) => d.id === x.eixo)) e.push(`${f.id}: eixo desconhecido ${x.eixo}`);
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
    if (x.tipo === "desfecho" && !d.indicadores.some((i) => i.id === a)) e.push(`eixo ${x.id}: indicador desconhecido ${a}`);
  }
  for (const t of textosDe(d)) for (const v of violacoes(t)) e.push(`doença: linguagem proibida (${v}): "${t.slice(0, 60)}"`);
  return e;
}

export function validarHipotese(h: Hipotese): string[] {
  const e: string[] = [];
  if (h.schema_versao !== "1.0") e.push("schema_versao inesperada");
  if (!/^HYP-\d{4}-\d{3,}$/.test(h.id)) e.push("id fora do formato HYP-AAAA-NNN");
  if (h.disclaimer !== DISCLAIMER_COMPLETO) e.push("disclaimer diferente do texto exigido");
  if (h.fontes.length === 0) e.push("hipótese sem fontes");
  if (hashDoConteudo(h) !== h.hash_conteudo) e.push("hash do conteúdo não confere (conteúdo alterado)");
  for (const t of textosDe(h)) for (const v of violacoes(t)) e.push(`linguagem proibida (${v}): "${t.slice(0, 60)}"`);
  return e;
}
