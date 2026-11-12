import type { Hipotese } from "../domain/types.ts";
export function gerarJSON(h: Hipotese): string { return JSON.stringify(h, null, 2) + "\n"; }
