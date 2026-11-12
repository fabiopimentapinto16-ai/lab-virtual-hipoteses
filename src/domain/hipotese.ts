import type { Doenca, EventoTempo, EstadoLinhaDoTempo, Ficha, Fonte, Hipotese, Match } from "./types.ts";
import { fazerMatches } from "./match.ts";
import { simular } from "./modelo.ts";
import { sha256Hex, jsonCanonico } from "./sha256.ts";
import { DISCLAIMER_COMPLETO, LIMITACOES_PADRAO } from "./textos.ts";

export const APP_VERSAO = "0.1.0";

export function proximoId(ano: number, existentes: string[]): string {
  const prefixo = `HYP-${ano}-`;
  let max = 0;
  for (const id of existentes) if (id.startsWith(prefixo)) max = Math.max(max, parseInt(id.slice(prefixo.length), 10) || 0);
  return prefixo + String(max + 1).padStart(3, "0");
}

export function hashDoConteudo(h: Omit<Hipotese, "hash_conteudo" | "linha_do_tempo"> | Hipotese): string {
  const { hash_conteudo: _a, linha_do_tempo: _b, ...resto } = h as Hipotese;
  return sha256Hex(jsonCanonico(resto));
}

function perguntaParaLab(d: Doenca, matches: Match[], fichas: Ficha[]): string {
  const ord = [...matches].sort((a, b) => b.score - a.score);
  const mec = ord.find((m) => m.tipo_eixo === "mecanismo");
  const alvo = mec ?? ord[0];
  if (!alvo) return "Sem match com o modelo: nada a testar. Ajuste a seleção de itens.";
  const nome = fichas.find((f) => f.id === alvo.ficha_id)?.nome_popular ?? alvo.ficha_id;
  if (mec) {
    const eixoDef = d.eixos.find((e) => e.id === mec.eixo)!;
    const no = d.nos.find((n) => n.id === eixoDef.alvo);
    const orgao = d.orgaos.find((o) => no?.orgaos.includes(o.id));
    const celula = orgao ? `${orgao.celula.toLowerCase()} (${orgao.nome.toLowerCase()})` : "modelo celular a critério do laboratório";
    return `Pergunta testável (in vitro ou in silico externo, com protocolo, controles e faixas definidos pelo laboratório): em ${celula}, ${nome} altera "${mec.eixo_nome.toLowerCase()}" na direção prevista pelo modelo, em comparação com controle sem o item?`;
  }
  return `Pergunta testável (laboratório externo): qual mecanismo celular poderia explicar o efeito relatado de ${nome} em "${alvo.eixo_nome.toLowerCase()}", e ele é mensurável em modelo celular relevante, com controles definidos pelo laboratório?`;
}

export interface EntradaHipotese {
  doenca: Doenca;
  fichas: Ficha[];
  fontes: Fonte[];
  seed: number;
  id: string;
  data: string; // AAAA-MM-DD
}

export function criarHipotese(e: EntradaHipotese): Hipotese {
  if (e.fichas.length === 0) throw new Error("Selecione pelo menos um item da biblioteca Natureza.");
  const matches = fazerMatches(e.doenca, e.fichas);
  const simulacao = simular(e.doenca, matches, e.seed);
  const idsFontes = new Set<string>();
  for (const n of e.doenca.nos) n.fontes.forEach((f) => idsFontes.add(f));
  for (const i of e.doenca.indicadores) i.fontes.forEach((f) => idsFontes.add(f));
  for (const f of e.fichas) { f.fontes.forEach((s) => idsFontes.add(s)); f.eixos.forEach((x) => x.fontes.forEach((s) => idsFontes.add(s))); }
  const alertas: string[] = [];
  const limitacoes = [...LIMITACOES_PADRAO];
  for (const f of e.fichas) {
    for (const a of f.alertas) alertas.push(`${f.nome_popular}: ${a}`);
    if (f.alertas_status === "nao_avaliado") alertas.push(`${f.nome_popular}: segurança não avaliada nesta ficha.`);
    for (const r of f.ressalvas) limitacoes.push(`${f.nome_popular}: ${r}`);
  }
  const base = {
    schema_versao: "1.0" as const,
    id: e.id,
    criada_em: e.data,
    app_versao: APP_VERSAO,
    doenca: { id: e.doenca.id, nome: e.doenca.nome, versao_modelo: e.doenca.versao_modelo, perfil: e.doenca.perfil },
    itens: e.fichas.map((f) => ({
      ficha_id: f.id, nome: f.nome_popular, nome_cientifico: f.nome_cientifico,
      compostos: f.compostos.map((c) => ({ nome: c.nome, id_publico: c.id_publico ?? null })),
    })),
    matches,
    simulacao,
    pergunta_para_lab: perguntaParaLab(e.doenca, matches, e.fichas),
    alertas,
    limitacoes,
    fontes: e.fontes.filter((f) => idsFontes.has(f.id)),
    disclaimer: DISCLAIMER_COMPLETO,
  };
  const linha_do_tempo: EventoTempo[] = [{ estado: "criada", data: e.data }];
  const hash_conteudo = sha256Hex(jsonCanonico(base));
  return { ...base, linha_do_tempo, hash_conteudo };
}

const ORDEM: EstadoLinhaDoTempo[] = ["criada", "publicada", "lab_testou", "resultado"];

/** Linha do tempo só avança, na ordem. Resultado do laboratório entra manualmente (ou importado depois). */
export function registrarEvento(h: Hipotese, estado: EstadoLinhaDoTempo, data: string, nota?: string): Hipotese {
  const ultimo = h.linha_do_tempo[h.linha_do_tempo.length - 1].estado;
  if (ORDEM.indexOf(estado) !== ORDEM.indexOf(ultimo) + 1) throw new Error(`Etapa inválida: depois de "${ultimo}" vem "${ORDEM[ORDEM.indexOf(ultimo) + 1] ?? "nada"}".`);
  return { ...h, linha_do_tempo: [...h.linha_do_tempo, { estado, data, ...(nota ? { nota } : {}) }] };
}

export function compararHipoteses(a: Hipotese, b: Hipotese): { variavel: string; a: number; b: number; delta_a: number; delta_b: number }[] {
  const chaves = ["gj", "gp", "razao_ri_beta", "ri", "beta", "hgp", "upt", "inf", "oxi"];
  return chaves.map((k) => ({
    variavel: k, a: a.simulacao.depois[k], b: b.simulacao.depois[k], delta_a: a.simulacao.deltas[k], delta_b: b.simulacao.deltas[k],
  }));
}
