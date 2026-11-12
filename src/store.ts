import type { Hipotese } from "./domain/types.ts";
const CHAVE = "lvh.hipoteses.v1";
/** Armazenamento local (localStorage). Se indisponível, mantém só em memória. */
let memoria: Hipotese[] = [];
export function carregar(): Hipotese[] {
  try { const s = localStorage.getItem(CHAVE); if (s) memoria = JSON.parse(s) as Hipotese[]; } catch { /* sem armazenamento */ }
  return memoria;
}
export function salvar(lista: Hipotese[]): void {
  memoria = lista;
  try { localStorage.setItem(CHAVE, JSON.stringify(lista)); } catch { /* sem armazenamento */ }
}
