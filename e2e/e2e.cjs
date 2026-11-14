// Teste de ponta a ponta com Playwright (Chromium). Uso: E2E_URL=http://localhost:4173 node e2e/e2e.cjs
const { chromium } = require("playwright");
const fs = require("fs");
const URL = process.env.E2E_URL || "http://localhost:4173/";
const DISC = "Validação somente experimental em laboratório.";
(async () => {
  fs.mkdirSync("e2e/saida", { recursive: true });
  const b = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const p = await b.newPage({ viewport: { width: 1200, height: 900 } });
  const erros = []; p.on("pageerror", (e) => erros.push(String(e))); p.on("console", (m) => { if (m.type() === "error") erros.push(m.text()); });
  const ok = (c, msg) => { if (!c) { console.error("FALHA:", msg); process.exitCode = 1; } else console.log("ok:", msg); };
  await p.goto(URL);
  ok((await p.textContent("#aviso-global")).includes(DISC), "aviso em destaque no topo");
  for (const [aba, nome] of [["inicio", "inicio"], ["doencas", "doencas"], ["natureza", "natureza"]]) { await p.click(`[data-aba=${aba}]`); await p.screenshot({ path: `e2e/saida/${nome}.png` }); }
  await p.click("[data-aba=doencas]"); await p.fill("#grau", "0"); const sau = await p.textContent("#tab-ind"); await p.fill("#grau", "100"); const doe = await p.textContent("#tab-ind");
  ok(sau !== doe, "indicadores mudam ao aplicar o estado de doença");
  await p.click("[data-aba=lab]"); await p.check("[data-sel=berberina]"); ok((await p.textContent("#conteudo")).includes("Médio"), "match com confiança exibida");
  ok((await p.textContent("#prev")).includes("Curva de resposta"), "prévia com curva de resposta");
  const antesPrev = await p.textContent("#prev"); await p.fill('[data-int="berberina"]', "50"); ok((await p.textContent("#prev")) !== antesPrev, "prévia muda ao mover a intensidade");
  await p.click("#sim"); await p.waitForSelector("#res table"); ok((await p.textContent("#res")).includes("HYP-"), "hipótese criada com ID público");
  await p.screenshot({ path: "e2e/saida/lab.png" });
  await p.click('[data-aba="3d"]'); await p.waitForSelector(".cena canvas");
  const px = await p.evaluate(() => { const c = document.querySelector(".cena canvas"); return c ? c.width * c.height : 0; });
  ok(px > 0, "canvas 3D criado"); await p.waitForTimeout(800); await p.screenshot({ path: "e2e/saida/3d.png" });
  for (const i of [1, 2, 3, 0]) { await p.click(`[data-cam="${i}"]`); await p.waitForSelector(".cena canvas"); await p.waitForTimeout(300); }
  await p.screenshot({ path: "e2e/saida/3d-camadas.png" });
  await p.selectOption("#sel-doenca", "hipertensao"); await p.click("[data-aba=lab]");
  ok((await p.textContent("#conteudo")).includes("Hipertensão essencial"), "troca para a hipertensão");
  await p.check("[data-sel=alho]"); await p.click("#sim"); await p.waitForSelector("#res table");
  ok((await p.textContent("#res")).includes("pressão arterial"), "hipótese de hipertensão criada");
  await p.screenshot({ path: "e2e/saida/lab-hipertensao.png" });
  await p.click('[data-aba="3d"]'); await p.waitForSelector(".cena canvas"); await p.waitForTimeout(600); await p.screenshot({ path: "e2e/saida/3d-hipertensao.png" });
  await p.click("[data-aba=exportar]");
  const [dl] = await Promise.all([p.waitForEvent("download"), p.click("#pdf")]); const pdf = await dl.path(); ok(fs.readFileSync(pdf).slice(0, 5).toString() === "%PDF-", "PDF baixado");
  const [dj] = await Promise.all([p.waitForEvent("download"), p.click("#json")]); const j = JSON.parse(fs.readFileSync(await dj.path(), "utf8")); ok(j.disclaimer.includes(DISC) && /^HYP-/.test(j.id), "JSON baixado com ID e disclaimer");
  await p.click("[data-aba=hipoteses]"); await p.click("[data-avanca]"); ok((await p.textContent("#conteudo")).includes("publicada"), "linha do tempo avança");
  await p.screenshot({ path: "e2e/saida/hipoteses.png" });
  await p.click("[data-aba=fontes]"); await p.screenshot({ path: "e2e/saida/fontes.png" });
  const reaviso = await p.evaluate(() => document.body.innerText.includes("Validação somente experimental em laboratório."));
  ok(reaviso, "disclaimer visível");
  ok(erros.length === 0, "sem erros de console/página" + (erros.length ? ": " + erros.join(" | ") : ""));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
