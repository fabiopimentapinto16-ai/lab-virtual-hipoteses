import type { Doenca, EixoFicha, Ficha, Match, NivelConfianca, Qualidade, TipoEvidencia } from "./types.ts";
import { derivar, estadoNos } from "./modelo.ts";

/** Regras de match 100% explícitas e auditáveis (ver docs/motor.md). */
export const PONTOS_EVIDENCIA: Record<TipoEvidencia, number> = {
  humano_meta_analise: 3, humano_ensaios: 2.5, humano_ensaio_unico: 2, mecanismo_em_revisao: 1.5, animal: 1.5, in_vitro: 1, historico: 0.5,
};
export const AJUSTE_QUALIDADE: Record<Qualidade, number> = { alta: 0.5, moderada: 0, baixa: -0.5, nao_declarada: -0.5, muito_baixa: -1 };
export const LIMIAR = { forte: 2.5, medio: 1.5 };

export const ROTULO_EVIDENCIA: Record<TipoEvidencia, string> = {
  humano_meta_analise: "meta-análise de ensaios em humanos", humano_ensaios: "revisão de ensaios em humanos",
  humano_ensaio_unico: "ensaio único em humanos", mecanismo_em_revisao: "mecanismo descrito em revisão",
  animal: "estudo em animais", in_vitro: "estudo in vitro", historico: "dado histórico",
};
export const ROTULO_QUALIDADE: Record<Qualidade, string> = {
  alta: "alta", moderada: "moderada", baixa: "baixa", muito_baixa: "muito baixa", nao_declarada: "não declarada pela fonte",
};

export function completude(f: Ficha, ex: EixoFicha): { valor: number; partes: string[] } {
  let v = 0;
  const partes: string[] = [];
  if (f.fontes.length > 0 && ex.fontes.length > 0) { v += 0.4; partes.push("fonte citada (+40%)"); }
  if (ex.nota && ex.nota.trim().length > 0) { v += 0.2; partes.push("detalhe do achado descrito (+20%)"); }
  if (f.alertas_status === "avaliado") { v += 0.2; partes.push("segurança avaliada (+20%)"); }
  else if (f.alertas_status === "parcial") { v += 0.1; partes.push("segurança parcialmente avaliada (+10%)"); }
  if (f.compostos.some((c) => c.id_publico?.verificado)) { v += 0.1; partes.push("ID público verificado (+10%)"); }
  if (f.parte_usada) { v += 0.1; partes.push("parte usada informada (+10%)"); }
  return { valor: Math.round(v * 100) / 100, partes };
}

export function eixoRelevante(d: Doenca, exId: string): boolean {
  const e = d.eixos.find((x) => x.id === exId);
  if (!e) return false;
  const sau = derivar(d, estadoNos(d, "saudavel"));
  const doe = derivar(d, estadoNos(d, "doenca"));
  const alvos = Array.isArray(e.alvo) ? e.alvo : [e.alvo];
  return alvos.some((a) => {
    const n = d.nos.find((x) => x.id === a);
    const dif = n ? Math.abs(n.doenca - n.saudavel) : Math.abs((doe[a] ?? 0) - (sau[a] ?? 0));
    return dif >= 10;
  });
}

export function pontuar(d: Doenca, f: Ficha, ex: EixoFicha): Match {
  const def = d.eixos.find((x) => x.id === ex.eixo)!;
  const pontos = PONTOS_EVIDENCIA[ex.evidencia];
  const ajuste = AJUSTE_QUALIDADE[ex.qualidade];
  const comp = completude(f, ex);
  const fator = 0.5 + 0.5 * comp.valor;
  const score = Math.round(Math.max(0, pontos + ajuste) * fator * 100) / 100;
  const motivos = [
    `Eixo "${def.nome}" (${def.tipo}) bate com variável desregulada do modelo.`,
    `Evidência declarada: ${ROTULO_EVIDENCIA[ex.evidencia]} (${pontos} pontos).`,
    `Qualidade da evidência: ${ROTULO_QUALIDADE[ex.qualidade]} (ajuste ${ajuste >= 0 ? "+" : ""}${ajuste}).`,
    `Completude da ficha: ${Math.round(comp.valor * 100)}% (${comp.partes.join("; ") || "nenhum item"}), fator ${fator.toFixed(2)}.`,
    `Pontuação = max(0, ${pontos} ${ajuste >= 0 ? "+" : "-"} ${Math.abs(ajuste)}) x ${fator.toFixed(2)} = ${score}.`,
  ];
  let nivel: NivelConfianca = score >= LIMIAR.forte && (ex.qualidade === "alta" || ex.qualidade === "moderada") ? "forte" : score >= LIMIAR.medio ? "medio" : "fraco";
  if (score >= LIMIAR.forte && nivel !== "forte") { nivel = "medio"; motivos.push("Limite aplicado: sem qualidade moderada/alta declarada, a confiança não passa de média."); }
  if (f.alertas_status === "nao_avaliado" && nivel !== "fraco") { nivel = "fraco"; motivos.push("Limite aplicado: ficha sem avaliação de segurança não passa de confiança fraca."); }
  if (ex.qualidade === "muito_baixa" && nivel !== "fraco") { nivel = "fraco"; motivos.push("Limite aplicado: evidência de qualidade muito baixa não passa de confiança fraca."); }
  return { ficha_id: f.id, eixo: ex.eixo, eixo_nome: def.nome, tipo_eixo: def.tipo, nivel, score, motivos, fontes: [...new Set([...ex.fontes])] };
}

export function fazerMatches(d: Doenca, fichas: Ficha[]): Match[] {
  const out: Match[] = [];
  for (const f of fichas) for (const ex of f.eixos) if (eixoRelevante(d, ex.eixo)) out.push(pontuar(d, f, ex));
  return out;
}

export const ROTULO_NIVEL: Record<NivelConfianca, string> = { forte: "Forte", medio: "Médio", fraco: "Fraco" };
export const EXPLICACAO_NIVEL: Record<NivelConfianca, string> = {
  forte: "Evidência declarada ampla, de qualidade pelo menos moderada, em ficha completa. Ainda é hipótese, não certeza clínica.",
  medio: "Há evidência declarada, mas com qualidade baixa/não declarada ou ficha incompleta. Interpretar com cautela.",
  fraco: "Evidência escassa, de qualidade muito baixa, histórica ou ficha sem avaliação de segurança. Só serve para levantar perguntas.",
};
