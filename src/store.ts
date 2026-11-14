import type { Hipotese } from "./domain/types.ts";
const CHAVE = "lvh.hipoteses.v1";
/** Armazenamento local (localStorage). Se indisponível, mantém só em memória. Registros de versões antigas do formato são preservados, mas não listados. */
let memoria: Hipotese[] = [];
let antigas: unknown[] = [];
export function carregar(): Hipotese[] {
  try {
    const s = localStorage.getItem(CHAVE);
    if (s) {
      const todos = JSON.parse(s) as { schema_versao?: string }[];
      memoria = todos.filter((h) => h.schema_versao === "1.1") as unknown as Hipotese[];
      antigas = todos.filter((h) => h.schema_versao !== "1.1");
    }
  } catch { /* sem armazenamento */ }
  return memoria;
}
export function salvar(lista: Hipotese[]): void {
  memoria = lista;
  try { localStorage.setItem(CHAVE, JSON.stringify([...antigas, ...lista])); } catch { /* sem armazenamento */ }
}
