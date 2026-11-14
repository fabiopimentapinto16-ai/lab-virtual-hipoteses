import type { Doenca, Hipotese } from "../domain/types.ts";
import { DISCLAIMER_COMPLETO } from "../domain/textos.ts";
import { ROTULO_NIVEL } from "../domain/match.ts";
import { Organ3D } from "./organ3d.ts";

export interface CenaVideo { titulo: string; legenda: string; dur: number }

export function cenas(h: Hipotese, d: Doenca): CenaVideo[] {
  const m = h.matches[0];
  const ip = d.derivados.find((x) => x.exibir && x.incerteza && !x.razao) ?? d.derivados[0];
  const orgao = "Órgão do modelo";
  return [
    { titulo: orgao, legenda: `Modelo do órgão para ${h.doenca.nome}. Perfil genérico, sem dados de pessoas.`, dur: 6 },
    { titulo: "Doença no modelo", legenda: "As regiões em vermelho indicam variáveis desreguladas no modelo.", dur: 7 },
    { titulo: "Match com a natureza", legenda: `${h.itens.map((i) => i.nome).join(", ")}: ${m ? `eixo ${m.eixo_nome}, confiança ${ROTULO_NIVEL[m.nivel]}` : "sem match"}.`, dur: 7 },
    { titulo: "Intervenção hipotética no modelo", legenda: `${ip.nome}: ${h.simulacao.antes[ip.id]} para ${h.simulacao.depois[ip.id]}. Só no modelo.`, dur: 8 },
    { titulo: `Hipótese ${h.id}`, legenda: DISCLAIMER_COMPLETO, dur: 6 },
  ];
}
export const DURACAO_TOTAL = (h: Hipotese, d: Doenca) => cenas(h, d).reduce((s, c) => s + c.dur, 0);

function quebrar(g: CanvasRenderingContext2D, t: string, larg: number): string[] {
  const out: string[] = []; let a = "";
  for (const w of t.split(" ")) { const x = a ? a + " " + w : w; if (g.measureText(x).width > larg && a) { out.push(a); a = w; } else a = x; }
  out.push(a); return out;
}

export function tipoMime(): string {
  for (const m of ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm"]) if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) return m;
  return "";
}

/** Grava uma animação de 30 a 90 s no próprio navegador (MediaRecorder). A narração TTS é opcional e só toca ao vivo: o navegador não a captura no arquivo. */
export async function gravarVideo(h: Hipotese, d: Doenca, opts: { narrar: boolean; progresso: (p: number) => void }): Promise<{ blob: Blob; mime: string; ext: string }> {
  const mime = tipoMime();
  if (!mime) throw new Error("Este navegador não grava vídeo (MediaRecorder indisponível).");
  const W = 1280, H = 720;
  const host = document.createElement("div"); host.style.cssText = `position:fixed;left:-99999px;top:0;width:${W}px;height:${H}px`; document.body.appendChild(host);
  const org = new Organ3D(host, d, W, H, true);
  const out = document.createElement("canvas"); out.width = W; out.height = H; const g = out.getContext("2d")!;
  const lista = cenas(h, d); const total = lista.reduce((s, c) => s + c.dur, 0);
  const rec = new MediaRecorder(out.captureStream(30), { mimeType: mime, videoBitsPerSecond: 3_000_000 });
  const partes: Blob[] = []; rec.ondataavailable = (e) => { if (e.data.size) partes.push(e.data); };
  const fim = new Promise<void>((res) => { rec.onstop = () => res(); });
  const sim = h.simulacao; let ultima = -1;
  const saud: Record<string, number> = Object.fromEntries(d.nos.map((n) => [n.id, n.saudavel]));
  rec.start(500);
  const t0 = performance.now();
  await new Promise<void>((resolve) => {
    const tick = () => {
      const t = (performance.now() - t0) / 1000;
      if (t >= total) { resolve(); return; }
      let acc = 0, idx = 0; for (; idx < lista.length; idx++) { if (t < acc + lista[idx].dur) break; acc += lista[idx].dur; }
      idx = Math.min(idx, lista.length - 1);
      const local = (t - acc) / lista[idx].dur;
      org.setOrgao(d.orgaos[0].id);
      org.setCamada(0);
      org.setCamera(Math.sin(t * 0.4) * 0.6);
      const antesDoenca = sim.antes;
      if (idx === 0) org.setValores(saud, saud, 1);
      else if (idx === 1) org.setValores(saud, antesDoenca, Math.min(1, local * 1.5));
      else if (idx === 2) org.setValores(antesDoenca, antesDoenca, 1);
      else org.setValores(antesDoenca, sim.depois, Math.min(1, local * 1.5));
      if (idx === 3 && ultima !== 3) org.iniciarFluxo();
      if (idx !== ultima && opts.narrar && "speechSynthesis" in window) { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(lista[idx].legenda); u.lang = "pt-BR"; speechSynthesis.speak(u); }
      ultima = idx;
      org.render();
      g.fillStyle = "#0c1a22"; g.fillRect(0, 0, W, H);
      if (idx < 4) g.drawImage(org.canvas, 0, 0, W, H);
      g.fillStyle = "rgba(8,16,22,.8)"; g.fillRect(0, 0, W, 70);
      g.fillStyle = "#fff"; g.font = "bold 34px sans-serif"; g.fillText(lista[idx].titulo, 32, 46);
      g.font = idx === 4 ? "bold 30px sans-serif" : "26px sans-serif";
      g.fillStyle = idx === 4 ? "rgba(8,16,22,1)" : "rgba(8,16,22,.8)";
      g.fillRect(0, idx === 4 ? 70 : H - 150, W, idx === 4 ? H - 70 : 150);
      g.fillStyle = "#fff";
      quebrar(g, lista[idx].legenda, W - 64).forEach((l, i) => g.fillText(l, 32, (idx === 4 ? 160 : H - 110) + i * 38));
      if (idx === 4) { g.font = "bold 64px sans-serif"; g.fillText(h.id, 32, 120); g.font = "22px sans-serif"; g.fillStyle = "#ffcf6b"; g.fillText(`Hash ${h.hash_conteudo.slice(0, 16)}… | modelo ${h.doenca.versao_modelo}`, 32, H - 70); }
      g.fillStyle = "#ffcf6b"; g.font = "bold 17px sans-serif"; g.fillText("Hipótese computacional educativa. Não é diagnóstico nem tratamento. Validação somente em laboratório.", 32, H - 22);
      opts.progresso(t / total);
      requestAnimationFrame(tick);
    };
    tick();
  });
  rec.stop(); await fim;
  if ("speechSynthesis" in window) speechSynthesis.cancel();
  org.dispose(); host.remove();
  const ext = mime.startsWith("video/mp4") ? "mp4" : "webm";
  return { blob: new Blob(partes, { type: mime }), mime, ext };
}
