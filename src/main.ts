import { DOENCAS, FICHAS, FONTES } from "./domain/dados.ts";
import type { Doenca, Ficha, Hipotese, Valores } from "./domain/types.ts";
import { derivar, estadoNos, nomeVariavel, variaveisExibidas } from "./domain/modelo.ts";
import { fazerMatches, fichasDaDoenca, ROTULO_NIVEL, EXPLICACAO_NIVEL, ROTULO_EVIDENCIA, ROTULO_QUALIDADE } from "./domain/match.ts";
import { criarHipotese, proximoId, registrarEvento, compararHipoteses, APP_VERSAO } from "./domain/hipotese.ts";
import { DISCLAIMER_COMPLETO, AVISO_MODELO, O_QUE_E, O_QUE_NAO_E } from "./domain/textos.ts";
import { carregar, salvar } from "./store.ts";
import { celulaSVG } from "./ui/celula.ts";
import { Organ3D, NOMES_CAMADA, type Camada3D } from "./ui/organ3d.ts";
import { gerarPDF } from "./export/pdf.ts";
import { gerarJSON } from "./export/json.ts";
import { criarZip } from "./export/zip.ts";
import { gravarVideo, tipoMime, DURACAO_TOTAL } from "./ui/video.ts";

const ICONES: Record<string, string> = {
  inicio: "M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z",
  doencas: "M3 12h4l3-8 4 16 3-8h4",
  natureza: "M5 19c0-8 5-14 15-14 0 10-6 15-14 15M5 19c2-5 5-8 9-10",
  lab: "M9 3h6M10 3v6L5 19a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1l-5-10V3M8 14h8",
  "3d": "M12 3l8 4v10l-8 4-8-4V7zM12 12l8-5M12 12v9M12 12L4 7",
  hipoteses: "M8 4h8v3H8zM6 6H5v15h14V6h-1M9 12h6M9 16h6",
  exportar: "M12 4v11M7 11l5 5 5-5M5 20h14",
  fontes: "M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM8 20V7",
};
const ABAS: [string, string][] = [["inicio", "Início"], ["doencas", "Doenças"], ["natureza", "Natureza"], ["lab", "Lab"], ["3d", "3D"], ["hipoteses", "Hipóteses"], ["exportar", "Exportar"], ["fontes", "Fontes"]];
const icone = (k: string) => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICONES[k]}"/></svg>`;

let d: Doenca = DOENCAS[0];
const S = { aba: "inicio", sel: new Set<string>(), seed: 42, hips: carregar(), selA: "", selB: "", orgao: d.orgaos[0].id, orgaoCel: d.orgaos[0].id, camada: 0 as Camada3D, lacunas: true, t: 1, grau: 100, mensagem: "" };
let viewers: Organ3D[] = [];
const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector(s) as T;
const esc = (s: unknown) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const hoje = () => new Date().toISOString().slice(0, 10);
const ficha = (id: string) => FICHAS.find((f) => f.id === id)!;
const hip = (id: string) => S.hips.find((h) => h.id === id);
const doencaDe = (id: string) => DOENCAS.find((x) => x.id === id)!;
const hipsDaDoenca = () => S.hips.filter((h) => h.doenca.id === d.id);

function trocarDoenca(id: string) {
  d = doencaDe(id); S.orgao = d.orgaos[0].id; S.orgaoCel = d.orgaos[0].id; S.sel = new Set(); S.selA = hipsDaDoenca().at(-1)?.id ?? ""; S.selB = ""; S.grau = 100; S.mensagem = "";
}

const refs = (dd: Doenca) => ({ s: derivar(dd, estadoNos(dd, "saudavel")), z: derivar(dd, estadoNos(dd, "doenca")) });
/** Em todos os modelos atuais, valor maior em derivados = pior; em nós vale `direcao_ruim`. */
function melhora(dd: Doenca, id: string, delta: number): boolean {
  const n = dd.nos.find((x) => x.id === id);
  return n ? (n.direcao_ruim === "alto" ? delta < 0 : delta > 0) : delta < 0;
}
const DISC = DISCLAIMER_COMPLETO;

function baixar(dados: BlobPart | Uint8Array, nome: string, tipo: string) {
  const blob = new Blob([dados as BlobPart], { type: tipo });
  const ponte = (window as unknown as { AndroidBridge?: { salvar(n: string, m: string, b: string): string } }).AndroidBridge;
  if (ponte) {
    const fr = new FileReader();
    fr.onload = () => { const r = ponte.salvar(nome, tipo, String(fr.result).split(",")[1] ?? ""); const st = document.querySelector("#st"); if (st) st.textContent = r === "ok" ? `Salvo em Downloads: ${nome}` : r; };
    fr.readAsDataURL(blob); return;
  }
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = nome; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
const barraConf = (n: "forte" | "medio" | "fraco") => `<div class="barra" title="${esc(EXPLICACAO_NIVEL[n])}"><i class="conf-${n}" style="width:${n === "forte" ? 100 : n === "medio" ? 62 : 28}%"></i></div>`;
const camadaTag = (c: string) => `<span class="tag ${c}">${c === "conhecido" ? "Conhecido" : c === "padrao_em_teste" ? "Padrão em teste" : "Lacuna"}</span>`;

function cabecalho() {
  $("#abas").innerHTML = ABAS.map(([id, nome]) => `<button role="tab" data-aba="${id}" aria-selected="${S.aba === id}">${icone(id)}<span>${nome}</span></button>`).join("");
  document.querySelectorAll<HTMLButtonElement>("[data-aba]").forEach((b) => (b.onclick = () => { S.aba = b.dataset.aba!; render(); window.scrollTo(0, 0); }));
  const sel = $<HTMLSelectElement>("#sel-doenca");
  sel.innerHTML = DOENCAS.map((x) => `<option value="${x.id}" ${x.id === d.id ? "selected" : ""}>${esc(x.nome)}</option>`).join("");
  sel.onchange = () => { trocarDoenca(sel.value); render(); };
}

function render() {
  viewers.forEach((v) => v.dispose()); viewers = [];
  cabecalho();
  ({ inicio, doencas, natureza, lab, "3d": tres, hipoteses, exportar, fontes } as Record<string, () => void>)[S.aba]();
}

function inicio() {
  $("#conteudo").innerHTML = `<section class="hero"><p class="eyebrow">Estudo aberto para validação em laboratório</p><h2>Do modelo da doença à pergunta testável.</h2>
  <p class="lead">Organize uma doença conhecida em vias e órgãos, cruze com fichas documentadas de plantas e compostos e gere uma hipótese com ID público para laboratórios reais examinarem.</p>
  <div class="stats"><div><b>${DOENCAS.length}</b><span>doenças modeladas</span></div><div><b>${FICHAS.length}</b><span>fichas com fonte</span></div><div><b>${FONTES.length}</b><span>fontes lidas</span></div><div><b>${S.hips.length}</b><span>hipóteses suas</span></div></div>
  <div class="linha"><button class="btn pri" data-ir="lab">Montar uma hipótese</button><button class="btn" data-ir="doencas">Ver as doenças</button></div></section>
  <div class="grid"><div class="card"><h3>O que é</h3><ul>${O_QUE_E.map((t) => `<li>${esc(t)}</li>`).join("")}</ul></div>
  <div class="card"><h3>O que não é</h3><ul>${O_QUE_NAO_E.map((t) => `<li>${esc(t)}</li>`).join("")}</ul></div></div>
  <div class="card"><h3>Como funciona</h3><ol class="passos"><li><b>Doenças</b>Modelo simplificado com nós de via, órgãos e lacunas.</li><li><b>Natureza</b>Fichas de plantas e compostos, todas com fonte.</li><li><b>Lab</b>Match com confiança explicada e simulação.</li><li><b>3D</b>Órgão, camadas, antes e depois, comparação.</li><li><b>Exportar</b>PDF, vídeo, JSON e pack com ID público.</li></ol>
  <p class="muted">${esc(AVISO_MODELO)} Versão ${APP_VERSAO}.</p></div>`;
  document.querySelectorAll<HTMLElement>("[data-ir]").forEach((b) => (b.onclick = () => { S.aba = b.dataset.ir!; render(); }));
}

function doencas() {
  const camadas = ["conhecido", "padrao_em_teste", "lacuna"] as const;
  const fonteLinks = (ids: string[]) => ids.map((i) => `<span class="tag">${esc(i)}</span>`).join(" ");
  const org = d.orgaos.find((o) => o.id === S.orgaoCel) ?? d.orgaos[0];
  const exib = variaveisExibidas(d);
  $("#conteudo").innerHTML = `<div class="card"><p class="eyebrow">Doença no modelo · v${esc(d.versao_modelo)}</p><h2>${esc(d.nome)}</h2><p>${esc(d.resumo_leigo)}</p><p class="muted">${esc(d.resumo_tecnico)}</p><p class="muted">${esc(d.perfil)}</p>${d.aviso ? `<p class="aviso">${esc(d.aviso)}</p>` : ""}</div>
  <div class="grid"><div class="card"><h3>Estado no modelo</h3>
  <label>Saudável ⟷ doença (perfil genérico): <b id="g-val">${S.grau}</b>%<input id="grau" type="range" min="0" max="100" value="${S.grau}"></label>
  <label>Célula do órgão: <select id="orgcel">${d.orgaos.map((o) => `<option value="${o.id}" ${o.id === org.id ? "selected" : ""}>${esc(o.nome)} — ${esc(o.celula)}</option>`).join("")}</select></label>
  <div id="cel"></div><p class="muted">${esc(AVISO_MODELO)}</p></div>
  <div class="card"><h3>Indicadores do modelo</h3><div class="tw"><table id="tab-ind"></table></div></div></div>
  <div class="card"><h3>Mapa por camadas</h3><label><input type="checkbox" id="lac" ${S.lacunas ? "checked" : ""}> Mostrar lacunas e padrões em teste (desligado = só conhecido)</label>
  ${camadas.map((c) => { const itens = [...d.nos.filter((n) => n.camada === c), ...d.derivados.filter((n) => n.camada === c && n.exibir), ...d.lacunas.filter((n) => n.camada === c)]; if (!itens.length || (c !== "conhecido" && !S.lacunas)) return ""; return `<h3>${camadaTag(c)}</h3><ul>${itens.map((n) => `<li class="${c === "lacuna" ? "cinza" : ""}"><b>${esc(n.nome)}</b>${"descricao" in n && n.descricao ? ": " + esc(n.descricao) : ""} ${"fontes" in n && n.fontes ? fonteLinks(n.fontes) : ""}</li>`).join("")}</ul>`; }).join("")}</div>
  <div class="card"><h3>Órgãos envolvidos</h3><ul>${d.orgaos.map((o) => `<li><b>${esc(o.nome)}</b> (${esc(o.tecido)}; célula: ${esc(o.celula)}) — hotspots: ${o.hotspots.map((h) => esc(h.nome)).join(", ")}</li>`).join("")}</ul></div>
  <div class="card"><h3>Alvos já descritos na literatura (referência, não é aconselhamento)</h3><ul>${d.alvos_literatura.map((a) => `<li>${esc(a.texto)} ${fonteLinks(a.fontes)}</li>`).join("")}</ul><p class="muted">${esc(d.como_ler_o_modelo)}</p></div>`;
  const atualiza = () => {
    const f = S.grau / 100; const s = estadoNos(d, "saudavel"), x = estadoNos(d, "doenca"); const nos: Valores = {};
    for (const n of d.nos) nos[n.id] = s[n.id] + (x[n.id] - s[n.id]) * f;
    const v = derivar(d, nos); const r = refs(d);
    $("#cel").innerHTML = celulaSVG(d, org, v);
    $("#tab-ind").innerHTML = `<tr><th>Variável</th><th>Valor</th><th class="larga">Saudável ⟷ doença</th></tr>` + exib.map((e) => `<tr><td>${esc(e.nome)}</td><td>${v[e.id]}</td><td><div class="trilho"><i class="ref" style="left:${Math.min(100, r.s[e.id])}%"></i><i class="ref" style="left:${Math.min(100, r.z[e.id])}%"></i><i class="marca" style="left:${Math.max(0, Math.min(100, v[e.id]))}%"></i></div></td></tr>`).join("");
    $("#g-val").textContent = String(S.grau);
  };
  $<HTMLInputElement>("#grau").oninput = (e) => { S.grau = Number((e.target as HTMLInputElement).value); atualiza(); };
  $<HTMLSelectElement>("#orgcel").onchange = (e) => { S.orgaoCel = (e.target as HTMLSelectElement).value; doencas(); };
  $<HTMLInputElement>("#lac").onchange = (e) => { S.lacunas = (e.target as HTMLInputElement).checked; doencas(); };
  atualiza();
}

function dialogoFicha(f: Ficha) {
  let dlg = $<HTMLDialogElement>("#dlg"); if (!dlg) { dlg = document.createElement("dialog"); dlg.id = "dlg"; document.body.appendChild(dlg); }
  const ids = f.compostos.map((c) => `<li><b>${esc(c.nome)}</b>: ${c.id_publico ? `${esc(c.id_publico.base)} ${esc(c.id_publico.tipo)} ${esc(c.id_publico.valor)} ${c.id_publico.verificado ? "(verificado)" : "(ainda não verificado)"} ${c.id_publico.base === "PubChem" ? `— <a href="https://pubchem.ncbi.nlm.nih.gov/compound/${encodeURIComponent(c.id_publico.valor)}" target="_blank" rel="noopener">abrir estrutura 2D no PubChem</a>` : ""}` : "sem ID público na ficha"}</li>`).join("");
  const ev = f.eixos.map((e) => `<li>${esc(doencaDe(e.doenca)?.nome ?? e.doenca)} · ${esc(doencaDe(e.doenca)?.eixos.find((x) => x.id === e.eixo)?.nome ?? e.eixo)}: ${esc(ROTULO_EVIDENCIA[e.evidencia])}, qualidade ${esc(ROTULO_QUALIDADE[e.qualidade])}${e.nota ? ` — ${esc(e.nota)}` : ""}</li>`).join("");
  dlg.innerHTML = `<h3>${esc(f.nome_popular)} <i class="muted">${esc(f.nome_cientifico)}</i></h3>
  <p>Parte usada: ${esc(f.parte_usada ?? "não informada pela fonte")}. Preparação estudada: ${esc(f.preparacao_estudada)}</p>
  <h4>Evidência por doença</h4><ul>${ev}</ul>
  <h4>Compostos</h4><ul>${ids || "<li>Sem compostos listados na ficha.</li>"}</ul><p class="muted">A estrutura 2D não é embutida (o app não acessa a rede); quando há ID, abra no PubChem.</p>
  <h4>Alertas (${f.alertas_status === "avaliado" ? "avaliados" : f.alertas_status === "parcial" ? "parcialmente avaliados" : "NÃO avaliados"})</h4><ul>${f.alertas.map((a) => `<li>${esc(a)}</li>`).join("") || "<li>Segurança não avaliada nesta ficha.</li>"}</ul>
  <h4>Ressalvas</h4><ul>${f.ressalvas.map((a) => `<li>${esc(a)}</li>`).join("")}</ul><p class="aviso">${esc(DISC)}</p><button class="btn" id="fechar">Fechar</button>`;
  $("#fechar").onclick = () => dlg.close(); dlg.showModal();
}
const ligarFichas = () => document.querySelectorAll<HTMLElement>("[data-ficha]").forEach((b) => (b.onclick = () => dialogoFicha(ficha(b.dataset.ficha!))));

function natureza() {
  $("#conteudo").innerHTML = `<div class="card"><label>Buscar planta ou composto: <input type="text" id="q" placeholder="berberina, canela, alho…"></label></div><div class="grid" id="fichas"></div>`;
  const lista = (q: string) => {
    const t = q.trim().toLowerCase();
    const fs = FICHAS.filter((f) => !t || [f.nome_popular, f.nome_cientifico, ...f.compostos.map((c) => c.nome)].join(" ").toLowerCase().includes(t));
    $("#fichas").innerHTML = fs.map((f) => `<div class="card"><h3>${esc(f.nome_popular)}</h3><i class="muted">${esc(f.nome_cientifico)}</i>
    <p>${[...new Set(f.eixos.map((e) => e.doenca))].map((id) => `<span class="tag">${esc(doencaDe(id).nome)}</span>`).join(" ")}</p>
    <p class="muted">Segurança: ${f.alertas_status === "nao_avaliado" ? "não avaliada nesta ficha" : f.alertas_status}. Fontes: ${f.fontes.join(", ")}</p>
    <button class="btn" data-ficha="${f.id}">Abrir ficha</button></div>`).join("") || `<p>Nada encontrado.</p>`;
    ligarFichas();
  };
  $<HTMLInputElement>("#q").oninput = (e) => lista((e.target as HTMLInputElement).value); lista("");
}

function kpis(h: Hipotese) {
  const dd = doencaDe(h.doenca.id);
  return `<div class="kpis">${h.variaveis.filter((v) => v.tipo === "derivado").map((v) => { const dl = h.simulacao.deltas[v.id]; const bom = melhora(dd, v.id, dl); return `<div class="kpi"><span>${esc(v.nome)}</span><b>${h.simulacao.depois[v.id]}</b><em>antes ${h.simulacao.antes[v.id]}</em><i class="chip ${dl === 0 ? "neutro" : bom ? "bom" : "ruim"}">${dl > 0 ? "+" : ""}${dl}</i></div>`; }).join("")}</div>`;
}
function resultadoTabela(h: Hipotese) {
  const dd = doencaDe(h.doenca.id); const r = refs(dd);
  return `<div class="tw"><table><tr><th>Variável</th><th>Antes</th><th>Depois</th><th>Delta</th><th>p10 / p50 / p90</th><th class="larga">Faixa do modelo</th></tr>${h.variaveis.map((v) => { const u = h.simulacao.incerteza[v.id]; const a = h.simulacao.antes[v.id], b = h.simulacao.depois[v.id]; const cl = (x: number) => Math.max(0, Math.min(100, x));
    return `<tr><td>${esc(v.nome)}</td><td>${a}</td><td>${b}</td><td>${h.simulacao.deltas[v.id]}</td><td>${u ? `${u.p10} / ${u.p50} / ${u.p90}` : "—"}</td><td><div class="trilho">${u ? `<i class="banda" style="left:${cl(a + u.p10)}%;width:${Math.abs(cl(a + u.p90) - cl(a + u.p10))}%"></i>` : ""}<i class="ref" style="left:${cl(r.s[v.id])}%"></i><i class="ref" style="left:${cl(r.z[v.id])}%"></i><i class="marca antes" style="left:${cl(a)}%"></i><i class="marca depois" style="left:${cl(b)}%"></i></div></td></tr>`; }).join("")}</table></div><p class="muted">Traços finos: referência saudável e doença do modelo. Vermelho: antes. Verde-água: depois. Faixa: p10–p90 da incerteza.</p>`;
}

function lab() {
  const disp = fichasDaDoenca(d, FICHAS);
  const sel = disp.filter((f) => S.sel.has(f.id));
  const ms = fazerMatches(d, sel);
  $("#conteudo").innerHTML = `<div class="grid"><div class="card"><p class="eyebrow">${esc(d.nome)}</p>${d.aviso ? `<p class="aviso">${esc(d.aviso)}</p>` : ""}<h2>1. Escolha itens da biblioteca</h2>${disp.length ? disp.map((f) => `<div class="linha"><label><input type="checkbox" data-sel="${f.id}" ${S.sel.has(f.id) ? "checked" : ""}> ${esc(f.nome_popular)} <i class="muted">${esc(f.nome_cientifico)}</i></label> <button class="btn" data-ficha="${f.id}">Ficha</button></div>`).join("") : `<p class="muted">Ainda não há ficha com evidência registrada para esta doença.</p>`}
  <p><label>Seed da simulação: <input type="number" id="seed" value="${S.seed}" style="width:7em"></label> <span class="muted">(mesma seed = mesmo resultado)</span></p></div>
  <div class="card"><h2>2. Match e confiança</h2>${ms.length ? ms.map((m) => `<div class="card"><b>${esc(ficha(m.ficha_id).nome_popular)} → ${esc(m.eixo_nome)}</b> <span class="tag">${ROTULO_NIVEL[m.nivel]}</span>${barraConf(m.nivel)}<p class="muted">${esc(EXPLICACAO_NIVEL[m.nivel])}</p><details><summary>Por que este nível?</summary><ul>${m.motivos.map((x) => `<li>${esc(x)}</li>`).join("")}</ul><p class="muted">Fontes: ${m.fontes.join(", ")}</p></details></div>`).join("") : `<p class="muted">Selecione ao menos um item para ver os matches.</p>`}</div></div>
  <div class="card"><h2>3. Simular</h2><button class="btn pri" id="sim" ${sel.length ? "" : "disabled"}>Rodar simulação e criar hipótese</button> <span id="msg" class="muted">${esc(S.mensagem)}</span><p class="aviso">${esc(DISC)}</p><div id="res"></div></div>`;
  document.querySelectorAll<HTMLInputElement>("[data-sel]").forEach((c) => (c.onchange = () => { c.checked ? S.sel.add(c.dataset.sel!) : S.sel.delete(c.dataset.sel!); lab(); }));
  $<HTMLInputElement>("#seed").onchange = (e) => { S.seed = Math.trunc(Number((e.target as HTMLInputElement).value)) || 0; };
  ligarFichas();
  $("#sim").onclick = () => {
    const h = criarHipotese({ doenca: d, fichas: sel, fontes: FONTES, seed: S.seed, id: proximoId(new Date().getFullYear(), S.hips.map((x) => x.id)), data: hoje() });
    S.hips = [...S.hips, h]; salvar(S.hips); S.selA = h.id; S.mensagem = `Criada ${h.id}.`;
    $("#msg").textContent = S.mensagem;
    $("#res").innerHTML = `<h3>${h.id}</h3>${kpis(h)}${resultadoTabela(h)}<p class="muted">${esc(h.pergunta_para_lab)}</p><p class="muted">${esc(AVISO_MODELO)}</p><p><button class="btn" data-ir="3d">Ver em 3D</button> <button class="btn" data-ir="exportar">Exportar</button></p>`;
    document.querySelectorAll<HTMLElement>("[data-ir]").forEach((b) => (b.onclick = () => { S.aba = b.dataset.ir!; render(); }));
  };
}

function tres() {
  const lista = hipsDaDoenca();
  const A = hip(S.selA), B = hip(S.selB);
  const o = d.orgaos.find((x) => x.id === S.orgao) ?? d.orgaos[0];
  $("#conteudo").innerHTML = `<div class="card linha">
  <label>Órgão <select id="org">${d.orgaos.map((x) => `<option value="${x.id}" ${x.id === o.id ? "selected" : ""}>${esc(x.nome)}</option>`).join("")}</select></label>
  <label>Hipótese A <select id="ha"><option value="">(só o estado da doença)</option>${lista.map((h) => `<option ${h.id === S.selA ? "selected" : ""}>${h.id}</option>`).join("")}</select></label>
  <label>Comparar com B <select id="hb"><option value="">(nenhuma)</option>${lista.map((h) => `<option ${h.id === S.selB ? "selected" : ""}>${h.id}</option>`).join("")}</select></label>
  <label><input type="checkbox" id="lac" ${S.lacunas ? "checked" : ""}> Mostrar lacunas</label></div>
  <div class="card linha"><span>Camada:</span>${NOMES_CAMADA.map((n, i) => `<button class="btn ${S.camada === i ? "pri" : ""}" data-cam="${i}">${n}</button>`).join("")}<button class="btn" id="anim">Animar intervenção</button></div>
  <div class="card"><label>Antes ⟷ depois: <b id="tv">${Math.round(S.t * 100)}</b>%<input id="tsl" type="range" min="0" max="100" value="${Math.round(S.t * 100)}"></label></div>
  <div class="grid" id="cenas"></div><div class="card" id="info"><b>Clique em uma região do órgão.</b> <span class="muted">Vermelho: variável desregulada no modelo. Azul brilhante: variável alterada pela hipótese.</span></div>
  <div class="card" id="cmp"></div>`;
  const antesDoenca = derivar(d, estadoNos(d, "doenca"));
  const painel = (h: Hipotese | undefined, rot: string) => { const w = document.createElement("div"); w.innerHTML = `<div class="card"><b>${rot}</b>${h ? ` — ${h.id}` : " — estado da doença"}</div><div class="cena"><div class="sobre">${esc(DISC)}</div></div>`; $("#cenas").appendChild(w); const v = new Organ3D(w.querySelector(".cena") as HTMLElement, d); v.setOrgao(o.id); v.setCamada(S.camada); v.setLacunas(S.lacunas); v.setValores(h ? h.simulacao.antes : antesDoenca, h ? h.simulacao.depois : antesDoenca, S.t); viewers.push(v);
    v.onHotspot = (hs) => { $("#info").innerHTML = hs ? `<b>${esc(hs.nome)}</b>: ${hs.nos.map((n) => { const nn = d.nos.find((x) => x.id === n)!; const a = (h ? h.simulacao.antes : antesDoenca)[n], dp = (h ? h.simulacao.depois : antesDoenca)[n]; return `${esc(nn.nome)} ${camadaTag(nn.camada)} ${a} → ${dp}`; }).join("; ")}` : "<b>Clique em uma região do órgão.</b>"; }; };
  painel(A, "A"); if (B) painel(B, "B");
  $("#cmp").innerHTML = A && B ? `<h3>Comparação A × B (depois da simulação)</h3><div class="tw"><table><tr><th>Variável</th><th>${A.id}</th><th>${B.id}</th></tr>${compararHipoteses(A, B).map((r) => `<tr><td>${esc(nomeVariavel(d, r.variavel))}</td><td>${r.a} (${r.delta_a})</td><td>${r.b} (${r.delta_b})</td></tr>`).join("")}</table></div>` : `<span class="muted">Escolha duas hipóteses para comparar lado a lado no mesmo órgão.</span>`;
  $("#cmp").innerHTML += `<p class="muted">Regiões de ${esc(o.nome)}: ${o.hotspots.map((h) => esc(h.nome)).join(", ")}.</p>`;
  $<HTMLSelectElement>("#org").onchange = (e) => { S.orgao = (e.target as HTMLSelectElement).value; render(); };
  $<HTMLSelectElement>("#ha").onchange = (e) => { S.selA = (e.target as HTMLSelectElement).value; render(); };
  $<HTMLSelectElement>("#hb").onchange = (e) => { S.selB = (e.target as HTMLSelectElement).value; render(); };
  $<HTMLInputElement>("#lac").onchange = (e) => { S.lacunas = (e.target as HTMLInputElement).checked; viewers.forEach((v) => v.setLacunas(S.lacunas)); };
  document.querySelectorAll<HTMLElement>("[data-cam]").forEach((b) => (b.onclick = () => { S.camada = Number(b.dataset.cam) as Camada3D; render(); }));
  $<HTMLInputElement>("#tsl").oninput = (e) => { S.t = Number((e.target as HTMLInputElement).value) / 100; $("#tv").textContent = String(Math.round(S.t * 100)); viewers.forEach((v, i) => { const h = i === 0 ? A : B; v.setValores(h ? h.simulacao.antes : antesDoenca, h ? h.simulacao.depois : antesDoenca, S.t); }); };
  $("#anim").onclick = () => viewers.forEach((v) => v.iniciarFluxo());
}

function hipoteses() {
  const prox: Record<string, [string, string] | undefined> = { criada: ["publicada", "Registrar: publicada"], publicada: ["lab_testou", "Registrar: laboratório testou"], lab_testou: ["resultado", "Registrar resultado"], resultado: undefined };
  const ordem = ["criada", "publicada", "lab_testou", "resultado"];
  $("#conteudo").innerHTML = S.hips.length ? S.hips.map((h) => { const ult = h.linha_do_tempo[h.linha_do_tempo.length - 1].estado; const p = prox[ult]; return `<div class="card"><h3>${h.id} <span class="muted">${h.criada_em}</span></h3><p>${h.itens.map((i) => esc(i.nome)).join(", ")} — ${esc(h.doenca.nome)}</p>
  <p>${[...new Set(h.matches.map((m) => m.nivel))].map((n) => `<span class="tag">${ROTULO_NIVEL[n]}</span>`).join(" ")}</p><div class="tempo">${ordem.map((e) => `<span class="${h.linha_do_tempo.some((x) => x.estado === e) ? "feito" : ""}">${e.replace("_", " ")}</span>`).join("")}</div>
  <p class="muted">${h.linha_do_tempo.map((e) => `${e.estado}: ${e.data}${e.nota ? " (" + esc(e.nota) + ")" : ""}`).join(" · ")}</p>
  <div class="linha">${p ? `<input type="text" placeholder="nota (opcional)" data-nota="${h.id}"><button class="btn" data-avanca="${h.id}">${p[1]}</button>` : ""}<button class="btn" data-a="${h.id}">Ver em 3D</button><button class="btn" data-b="${h.id}">Comparar (B)</button><button class="btn" data-exp="${h.id}">Exportar</button></div></div>`; }).join("") : `<div class="card">Nenhuma hipótese ainda. Crie uma na aba Lab.</div>`;
  const abrir = (id: string, aba: string, b = false) => { const h = hip(id)!; if (h.doenca.id !== d.id) trocarDoenca(h.doenca.id); if (b) S.selB = id; else S.selA = id; S.aba = aba; render(); };
  document.querySelectorAll<HTMLElement>("[data-avanca]").forEach((b) => (b.onclick = () => {
    const id = b.dataset.avanca!; const h = hip(id)!; const ult = h.linha_do_tempo[h.linha_do_tempo.length - 1].estado; const nota = $<HTMLInputElement>(`[data-nota="${id}"]`).value.trim();
    S.hips = S.hips.map((x) => (x.id === id ? registrarEvento(h, prox[ult]![0] as "publicada", hoje(), nota || undefined) : x)); salvar(S.hips); hipoteses();
  }));
  document.querySelectorAll<HTMLElement>("[data-a]").forEach((b) => (b.onclick = () => abrir(b.dataset.a!, "3d")));
  document.querySelectorAll<HTMLElement>("[data-b]").forEach((b) => (b.onclick = () => { const h = hip(b.dataset.b!)!; if (h.doenca.id !== d.id) trocarDoenca(h.doenca.id); S.selB = h.id; S.aba = "3d"; render(); }));
  document.querySelectorAll<HTMLElement>("[data-exp]").forEach((b) => (b.onclick = () => abrir(b.dataset.exp!, "exportar")));
}

const videoCache: Record<string, { blob: Blob; ext: string }> = {};
function exportar() {
  const h = hip(S.selA) ?? S.hips[S.hips.length - 1];
  if (!h) { $("#conteudo").innerHTML = `<div class="card">Crie uma hipótese na aba Lab para exportar.</div>`; return; }
  S.selA = h.id;
  const dd = doencaDe(h.doenca.id);
  const mime = tipoMime();
  $("#conteudo").innerHTML = `<div class="card"><h2>Exportar ${h.id}</h2><label>Hipótese <select id="hs">${S.hips.map((x) => `<option ${x.id === h.id ? "selected" : ""}>${x.id}</option>`).join("")}</select></label>
  <p class="aviso">${esc(DISC)}</p>
  <div class="linha"><button class="btn pri" id="pdf">Baixar PDF</button><button class="btn pri" id="json">Baixar JSON</button><button class="btn pri" id="vid" ${mime ? "" : "disabled"}>Gerar vídeo (${DURACAO_TOTAL(h, dd)} s)</button><button class="btn pri" id="pack" ${mime ? "" : "disabled"}>Pack ZIP (PDF + vídeo + JSON)</button></div>
  <p><label><input type="checkbox" id="tts"> Narração em português (fala ao vivo durante a gravação)</label></p>
  <p class="muted">${mime ? `Formato de vídeo neste navegador: ${esc(mime.split(";")[0])}${mime.includes("mp4") ? "" : " (MP4 não é suportado aqui; será gerado WebM)"}.` : "Este navegador não grava vídeo."} A narração é voz sintética ao vivo e não é gravada dentro do arquivo (limite do navegador).</p>
  <div class="barra"><i class="conf-medio" id="prog" style="width:0"></i></div><p id="st" class="muted"></p><p class="muted">ID público: <b>${h.id}</b> · hash do conteúdo: <code>${h.hash_conteudo.slice(0, 16)}…</code></p></div>`;
  $<HTMLSelectElement>("#hs").onchange = (e) => { S.selA = (e.target as HTMLSelectElement).value; exportar(); };
  const st = (t: string) => ($("#st").textContent = t);
  $("#pdf").onclick = async () => { baixar(await gerarPDF(h), `${h.id}.pdf`, "application/pdf"); st("PDF gerado."); };
  $("#json").onclick = () => { baixar(gerarJSON(h), `${h.id}.json`, "application/json"); st("JSON gerado."); };
  const video = async () => {
    const narrar = $<HTMLInputElement>("#tts").checked; st("Gravando vídeo… mantenha esta aba aberta.");
    const r = await gravarVideo(h, dd, { narrar, progresso: (p) => ($("#prog").style.width = `${Math.round(p * 100)}%`) });
    videoCache[h.id] = { blob: r.blob, ext: r.ext }; return r;
  };
  $("#vid").onclick = async () => { try { const r = await video(); baixar(r.blob, `${h.id}.${r.ext}`, r.mime); st(`Vídeo gerado (${r.ext}).`); } catch (e) { st(String(e)); } };
  $("#pack").onclick = async () => {
    try {
      const r = videoCache[h.id] ?? (await video());
      const zip = criarZip([{ nome: `${h.id}.pdf`, dados: await gerarPDF(h) }, { nome: `${h.id}.json`, dados: new TextEncoder().encode(gerarJSON(h)) }, { nome: `${h.id}.${r.ext}`, dados: new Uint8Array(await r.blob.arrayBuffer()) }, { nome: "LEIA-ME.txt", dados: new TextEncoder().encode(DISC + "\n") }]);
      baixar(zip, `${h.id}-pack.zip`, "application/zip"); st("Pack gerado.");
    } catch (e) { st(String(e)); }
  };
}

function fontes() {
  $("#conteudo").innerHTML = `<div class="card"><h2>Como citar</h2><p>Cite o ID público e o hash da hipótese (ex.: <code>HYP-2026-001</code>), a versão do app (${APP_VERSAO}) e a versão do modelo da doença. Cite também as fontes originais abaixo, que sustentam as fichas.</p>
  <h3>Limites</h3><ul><li>As fontes são lidas e resumidas nas fichas; o app não substitui a leitura do artigo original.</li><li>Campos marcados como "não avaliado", "não declarada" ou "ainda não verificado" não foram confirmados.</li><li>Nada aqui é recomendação de uso por pessoas.</li></ul></div>
  ${FONTES.map((f) => `<div class="card"><b>[${esc(f.id)}]</b> ${esc(f.citacao)}<br><a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.url)}</a><p class="muted">Lido em ${esc(f.lido_em)}. O que a fonte diz: ${esc(f.o_que_a_fonte_diz)}</p></div>`).join("")}`;
}

render();
