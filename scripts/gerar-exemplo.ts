import { writeFileSync } from "node:fs";
import { DOENCAS, FICHAS, FONTES } from "../src/domain/dados.ts";
import { criarHipotese } from "../src/domain/hipotese.ts";
import { gerarPDF } from "../src/export/pdf.ts";
import { gerarJSON } from "../src/export/json.ts";

// Exemplo de demonstração: data fixa e seed fixa para o resultado ser reproduzível. Só dados de fichas públicas, sem pessoas.
const pegar = (id: string) => FICHAS.find((f) => f.id === id)!;
const h = criarHipotese({ doenca: DOENCAS[0], fichas: [pegar("berberina"), pegar("curcuma")], fontes: FONTES, seed: 42, id: "HYP-2026-001", data: "2026-11-12" });
writeFileSync("exemplos/HYP-2026-001.json", gerarJSON(h));
writeFileSync("exemplos/HYP-2026-001.pdf", await gerarPDF(h));
console.log("Gerado exemplos/HYP-2026-001.{json,pdf}", h.hash_conteudo);
