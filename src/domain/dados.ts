import type { Doenca, Ficha, Fonte } from "./types.ts";
import fontesJson from "../../data/fontes.json" with { type: "json" };
import dm2 from "../../data/doencas/diabetes-tipo-2.json" with { type: "json" };
import berberina from "../../data/naturezas/berberina.json" with { type: "json" };
import curcuma from "../../data/naturezas/curcuma.json" with { type: "json" };
import canela from "../../data/naturezas/canela.json" with { type: "json" };
import melao from "../../data/naturezas/melao_sao_caetano.json" with { type: "json" };
import feno from "../../data/naturezas/feno_grego.json" with { type: "json" };
import galega from "../../data/naturezas/galega.json" with { type: "json" };

export const FONTES = fontesJson as unknown as Fonte[];
export const DOENCAS = [dm2 as unknown as Doenca];
export const FICHAS = [berberina, curcuma, canela, melao, feno, galega] as unknown as Ficha[];
