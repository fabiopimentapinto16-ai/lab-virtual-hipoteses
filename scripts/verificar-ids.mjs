// Confere os IDs PubChem das fichas na API pública. Falha só se o ID não existir; mostra o nome oficial para conferência humana.
import { readFileSync, readdirSync } from "node:fs";
const dir = new URL("../data/naturezas/", import.meta.url);
let falhas = 0;
for (const arq of readdirSync(dir)) {
  const f = JSON.parse(readFileSync(new URL(arq, dir), "utf8"));
  for (const c of f.compostos ?? []) {
    const id = c.id_publico; if (!id || id.base !== "PubChem") continue;
    const r = await fetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${id.valor}/property/Title/JSON`);
    if (!r.ok) { console.error(`FALHA ${f.id}/${c.nome}: CID ${id.valor} -> HTTP ${r.status}`); falhas++; continue; }
    const t = (await r.json()).PropertyTable.Properties[0].Title;
    const bate = t.toLowerCase().includes(c.nome.toLowerCase().slice(0, 5));
    console.log(`${bate ? "OK   " : "CONFERIR"} ${f.id}/${c.nome}: CID ${id.valor} = "${t}" (verificado=${id.verificado})`);
  }
}
process.exit(falhas ? 1 : 0);
