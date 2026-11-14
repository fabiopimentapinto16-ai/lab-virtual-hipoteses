/** Atlas de anatomia real: modelos 3D do HuBMAP CCF 3D Reference Object Library v1.2 (CC BY 4.0). */
export interface OrgaoAtlas {
  id: string;
  nome: string;
  /** Arquivos em public/modelos (sem extensão). Vários = mostrados juntos na posição anatômica real. */
  arquivos: string[];
  nota?: string;
  /** Liga o órgão a um órgão de um modelo de doença: o grau de comprometimento colore as regiões. */
  vinculo?: { doenca: string; orgao: string };
}

export const CREDITO_ATLAS = {
  titulo: "HuBMAP CCF 3D Reference Object Library",
  versao: "v1.2",
  licenca: "CC BY 4.0",
  url: "https://hubmapconsortium.github.io/ccf/pages/ccf-3d-reference-library.html",
  autores: "Browne, Schlehlein, Herr II, Quardokus, Bueckle, Börner",
  ano: 2022,
  alteracoes: "Arquivos GLB usados sem edição de malha; no app são apenas centralizados, escalados e coloridos.",
};

export const ATLAS: OrgaoAtlas[] = [
  { id: "cerebro", nome: "Cérebro", arquivos: ["Allen_M_Brain"], nota: "Anatomia apenas; ainda não há modelo de doença do cérebro." },
  { id: "coracao", nome: "Coração", arquivos: ["VH_M_Heart"], nota: "Anatomia apenas; ainda não há modelo de doença do coração." },
  { id: "pulmoes", nome: "Pulmões", arquivos: ["VH_M_Lung"] },
  { id: "figado", nome: "Fígado", arquivos: ["VH_M_Liver"], vinculo: { doenca: "diabetes-tipo-2", orgao: "figado" } },
  { id: "pancreas", nome: "Pâncreas", arquivos: ["VH_M_Pancreas"], vinculo: { doenca: "diabetes-tipo-2", orgao: "pancreas" } },
  { id: "rim_esquerdo", nome: "Rim esquerdo", arquivos: ["VH_M_Kidney_L"], vinculo: { doenca: "hipertensao", orgao: "rim" } },
  { id: "rim_direito", nome: "Rim direito", arquivos: ["VH_M_Kidney_R"] },
  { id: "baco", nome: "Baço", arquivos: ["VH_M_Spleen"] },
  { id: "timo", nome: "Timo", arquivos: ["VH_M_Thymus"] },
  { id: "intestino_delgado", nome: "Intestino delgado", arquivos: ["VH_M_Small_Intestine"] },
  { id: "intestino_grosso", nome: "Intestino grosso", arquivos: ["SBU_M_Intestine_Large"] },
  { id: "bexiga", nome: "Bexiga", arquivos: ["VH_M_Urinary_Bladder"] },
  { id: "ureteres", nome: "Ureteres", arquivos: ["VH_M_Ureter_L", "VH_M_Ureter_R"] },
  { id: "uretra", nome: "Uretra (masculino)", arquivos: ["VH_M_Urethra"] },
  { id: "prostata", nome: "Próstata (masculino)", arquivos: ["VH_M_Prostate"] },
  { id: "olhos", nome: "Olhos", arquivos: ["VH_M_Eye_L", "VH_M_Eye_R"] },
  { id: "vasos", nome: "Vasos sanguíneos", arquivos: ["VH_M_Blood_Vasculature"] },
  { id: "pele", nome: "Pele", arquivos: ["VH_M_Skin"] },
  { id: "medula_espinhal", nome: "Medula espinhal", arquivos: ["VH_M_Spinal_Cord"] },
  { id: "linfonodo", nome: "Linfonodo", arquivos: ["NIH_M_Lymph_Node"] },
  { id: "pelve", nome: "Pelve", arquivos: ["VH_M_Pelvis"] },
  { id: "joelhos", nome: "Joelhos", arquivos: ["VH_M_Knee_L", "VH_M_Knee_R"] },
  { id: "utero", nome: "Útero (feminino)", arquivos: ["VH_F_Uterus"] },
  { id: "ovarios", nome: "Ovários (feminino)", arquivos: ["VH_F_Ovary_L", "VH_F_Ovary_R"] },
  { id: "tubas", nome: "Tubas uterinas (feminino)", arquivos: ["VH_F_Fallopian_Tube_L", "VH_F_Fallopian_Tube_R"] },
  { id: "placenta", nome: "Placenta (feminino)", arquivos: ["VH_F_Placenta"] },
];

/** Nome legível de uma estrutura a partir do nome do mesh no GLB (ex.: VH_M_head_of_pancreas -> head of pancreas). */
export function nomeEstrutura(mesh: string): string {
  return mesh.replace(/^(VH|Allen|NIH|SBU)_[MF]_/i, "").replace(/_/g, " ").trim();
}
