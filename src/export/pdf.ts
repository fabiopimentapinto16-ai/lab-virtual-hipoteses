import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { Hipotese } from "../domain/types.ts";
import { DISCLAIMER_COMPLETO } from "../domain/textos.ts";
import { ROTULO_NIVEL } from "../domain/match.ts";

/** Fontes padrão do PDF usam WinAnsi: troca símbolos fora desse conjunto. */
export function sanitizar(t: string): string {
  return t.replace(/→/g, "->").replace(/≥/g, ">=").replace(/≤/g, "<=").replace(/Δ/g, "delta ").replace(/[–—]/g, "-").replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/…/g, "...").replace(/[^\x09\x0A\x0D\x20-\x7E -ÿ]/g, "?");
}

function quebrar(t: string, f: PDFFont, tam: number, larg: number): string[] {
  const linhas: string[] = [];
  for (const par of sanitizar(t).split("\n")) {
    let atual = "";
    for (const w of par.split(/\s+/)) {
      const teste = atual ? atual + " " + w : w;
      if (f.widthOfTextAtSize(teste, tam) > larg && atual) { linhas.push(atual); atual = w; } else atual = teste;
    }
    linhas.push(atual);
  }
  return linhas;
}

export async function gerarPDF(h: Hipotese): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const f = await doc.embedFont(StandardFonts.Helvetica);
  const b = await doc.embedFont(StandardFonts.HelveticaBold);
  const W = 595, H = 842, M = 48, L = W - 2 * M;
  let p: PDFPage = doc.addPage([W, H]);
  let y = H - M;
  const rodape = (pg: PDFPage) => { pg.drawText(sanitizar(`${h.id} - Hipotese computacional educativa. Nao e diagnostico nem tratamento.`), { x: M, y: 24, size: 7, font: f, color: rgb(0.4, 0.4, 0.4) }); };
  rodape(p);
  const garantir = (n: number) => { if (y - n < 44) { p = doc.addPage([W, H]); rodape(p); y = H - M; } };
  const texto = (t: string, tam = 10, fonte = f, cor = rgb(0.1, 0.1, 0.1), recuo = 0) => {
    for (const l of quebrar(t, fonte, tam, L - recuo)) { garantir(tam + 4); p.drawText(l, { x: M + recuo, y: y - tam, size: tam, font: fonte, color: cor }); y -= tam + 3.5; }
  };
  const titulo = (t: string) => { y -= 8; garantir(24); texto(t, 12, b, rgb(0.05, 0.3, 0.35)); y -= 1; };

  // aviso no topo
  const aviso = quebrar(DISCLAIMER_COMPLETO, b, 9, L - 16);
  const alt = aviso.length * 12 + 12;
  p.drawRectangle({ x: M, y: y - alt, width: L, height: alt, color: rgb(1, 0.95, 0.8), borderColor: rgb(0.8, 0.55, 0.1), borderWidth: 1 });
  aviso.forEach((l, i) => p.drawText(l, { x: M + 8, y: y - 16 - i * 12, size: 9, font: b, color: rgb(0.4, 0.2, 0) }));
  y -= alt + 14;

  texto(`Hipotese ${h.id}`, 20, b);
  texto(`Data: ${h.criada_em}  |  Doenca/via: ${h.doenca.nome} (modelo ${h.doenca.versao_modelo})  |  App ${h.app_versao}`, 9);
  texto(`Seed da simulacao: ${h.simulacao.seed}  |  Hash do conteudo (SHA-256): ${h.hash_conteudo}`, 7);
  texto(h.doenca.perfil, 9);

  titulo("1. Variaveis desreguladas no modelo (antes)");
  for (const v of h.variaveis) texto(`- ${v.nome}: ${h.simulacao.antes[v.id]}`, 10, f, undefined, 6);
  texto("Valores em indice do modelo (0-100), ilustrativos; nao sao medidas em pessoas.", 8, f, rgb(0.35, 0.35, 0.35));

  titulo("2. Plantas/compostos e IDs publicos");
  for (const i of h.itens) {
    texto(`${i.nome} (${i.nome_cientifico})`, 10, b);
    if (i.compostos.length === 0) texto("Sem compostos listados na ficha.", 9, f, undefined, 6);
    for (const c of i.compostos) texto(`- ${c.nome}${c.id_publico ? ` - ${c.id_publico.base} ${c.id_publico.tipo} ${c.id_publico.valor}${c.id_publico.verificado ? " (verificado)" : " (nao verificado)"}` : " - sem ID publico"}`, 9, f, undefined, 6);
  }

  titulo("3. Motivo do match e nivel de confianca");
  for (const m of h.matches.filter((x) => h.itens.some((i) => i.ficha_id === x.ficha_id))) {
    texto(`${m.ficha_id} -> ${m.eixo_nome}: confianca ${ROTULO_NIVEL[m.nivel]} (pontuacao ${m.score})`, 10, b);
    for (const mo of m.motivos) texto(`- ${mo}`, 8.5, f, undefined, 6);
    texto(`Fontes: ${m.fontes.join(", ")}`, 8, f, rgb(0.35, 0.35, 0.35), 6);
  }

  titulo("4. Resultado da simulacao no modelo (depois e deltas)");
  for (const v of h.variaveis) {
    const k = v.id;
    const d = h.simulacao.deltas[k];
    const u = h.simulacao.incerteza[k];
    texto(`- ${v.nome}: ${h.simulacao.antes[k]} -> ${h.simulacao.depois[k]} (delta ${d > 0 ? "+" : ""}${d})${u ? `  faixa p10/p50/p90: ${u.p10} / ${u.p50} / ${u.p90}` : ""}`, 9, f, undefined, 6);
  }
  texto("Simulacao deterministica com regras lineares simples. A faixa mostra apenas a incerteza assumida pela confianca do match.", 8, f, rgb(0.35, 0.35, 0.35));

  titulo("5. Experiencia sugerida ao laboratorio");
  texto(h.pergunta_para_lab, 10);
  texto("Protocolo, controles, concentracoes e analise sao definidos pelo laboratorio. Este documento nao propoe doses.", 8.5, f, rgb(0.35, 0.35, 0.35));

  titulo("6. Limitacoes e toxicidade/alertas conhecidos");
  for (const l of h.limitacoes) texto(`- ${l}`, 9, f, undefined, 6);
  if (h.alertas.length) { texto("Alertas das fichas:", 9, b); for (const a of h.alertas) texto(`- ${a}`, 9, f, undefined, 6); }

  titulo("7. Linha do tempo");
  for (const e of h.linha_do_tempo) texto(`- ${e.estado}: ${e.data}${e.nota ? " - " + e.nota : ""}`, 9, f, undefined, 6);

  titulo("8. Referencias / fontes das fichas");
  for (const s of h.fontes) { texto(`[${s.id}] ${s.citacao}`, 8.5, f, undefined, 0); texto(`${s.url}`, 7.5, f, rgb(0.1, 0.3, 0.6), 10); texto(`O que a fonte diz: ${s.o_que_a_fonte_diz}`, 8, f, rgb(0.35, 0.35, 0.35), 10); }

  titulo("Disclaimer completo");
  texto(h.disclaimer, 10, b);
  doc.setTitle(sanitizar(`Hipotese ${h.id}`));
  doc.setSubject("Hipotese computacional educativa - validacao somente experimental em laboratorio");
  doc.setProducer("lab-virtual-hipoteses");
  return doc.save();
}
