export type Camada = "conhecido" | "padrao_em_teste" | "lacuna";
export type NivelConfianca = "forte" | "medio" | "fraco";
export type StatusAlertas = "avaliado" | "parcial" | "nao_avaliado";

export interface Fonte {
  id: string;
  citacao: string;
  doi?: string;
  pmid?: string;
  url: string;
  tipo: string;
  lido_em: string;
  o_que_a_fonte_diz: string;
}

export interface NoModelo {
  id: string;
  nome: string;
  camada: Camada;
  orgaos: string[];
  direcao_ruim: "alto" | "baixo";
  saudavel: number;
  doenca: number;
  fontes: string[];
  descricao: string;
}

export interface Lacuna {
  id: string;
  nome: string;
  camada: Camada;
  descricao: string;
}

export interface Hotspot { id: string; nome: string; nos: string[] }
export interface OrgaoModelo { id: string; nome: string; tecido: string; celula: string; nos: string[]; hotspots: Hotspot[] }

export interface EixoDef {
  id: string;
  nome: string;
  tipo: "mecanismo" | "desfecho";
  alvo: string | string[];
  delta: number;
}

export interface Coeficientes {
  descricao: string;
  ri_ef: { inf: number; oxi: number };
  hgp_ef: { ri_ef: number };
  gj: { base: number; hgp_ef: number; beta_inv: number; ri_ef: number };
  gp: { base: number; upt_inv: number; beta_inv: number; ri_ef: number };
  limite_delta_por_variavel: number;
}

export interface ConfigSimulacao {
  fator_confianca: Record<NivelConfianca, number>;
  incerteza: Record<NivelConfianca, [number, number]>;
  combinacao_mesmo_eixo: string;
  amostras_incerteza: number;
}

export interface Doenca {
  id: string;
  versao_modelo: string;
  nome: string;
  resumo_leigo: string;
  resumo_tecnico: string;
  perfil: string;
  orgaos: OrgaoModelo[];
  nos: NoModelo[];
  lacunas: Lacuna[];
  indicadores: { id: string; nome: string; unidade: string; fontes: string[] }[];
  equacoes: Coeficientes;
  eixos: EixoDef[];
  alvos_literatura: { texto: string; fontes: string[] }[];
  simulacao: ConfigSimulacao;
  como_ler_o_modelo: string;
}

export type TipoEvidencia =
  | "humano_meta_analise" | "humano_ensaios" | "humano_ensaio_unico"
  | "mecanismo_em_revisao" | "animal" | "in_vitro" | "historico";
export type Qualidade = "alta" | "moderada" | "baixa" | "muito_baixa" | "nao_declarada";

export interface EixoFicha {
  eixo: string;
  direcao: "melhora";
  evidencia: TipoEvidencia;
  qualidade: Qualidade;
  fontes: string[];
  nota?: string;
}

export interface IdPublico { base: string; tipo: string; valor: string; verificado: boolean }
export interface Composto { id: string; nome: string; id_publico?: IdPublico | null }

export interface Ficha {
  id: string;
  nome_popular: string;
  nome_cientifico: string;
  parte_usada: string | null;
  parte_usada_fonte?: string;
  preparacao_estudada: string;
  compostos: Composto[];
  eixos: EixoFicha[];
  alertas_status: StatusAlertas;
  alertas: string[];
  ressalvas: string[];
  fontes: string[];
}

export interface Match {
  ficha_id: string;
  eixo: string;
  eixo_nome: string;
  tipo_eixo: "mecanismo" | "desfecho";
  nivel: NivelConfianca;
  score: number;
  motivos: string[];
  fontes: string[];
}

export type Valores = Record<string, number>;

export interface FaixaIncerteza { p10: number; p50: number; p90: number }

export interface ResultadoSimulacao {
  seed: number;
  antes: Valores;
  depois: Valores;
  deltas: Valores;
  incerteza: Record<string, FaixaIncerteza>;
  efeitos_aplicados: { eixo: string; delta: number; itens: string[] }[];
}

export type EstadoLinhaDoTempo = "criada" | "publicada" | "lab_testou" | "resultado";
export interface EventoTempo { estado: EstadoLinhaDoTempo; data: string; nota?: string }

export interface Hipotese {
  schema_versao: "1.0";
  id: string;
  criada_em: string;
  app_versao: string;
  doenca: { id: string; nome: string; versao_modelo: string; perfil: string };
  itens: { ficha_id: string; nome: string; nome_cientifico: string; compostos: { nome: string; id_publico: IdPublico | null }[] }[];
  matches: Match[];
  simulacao: ResultadoSimulacao;
  pergunta_para_lab: string;
  alertas: string[];
  limitacoes: string[];
  fontes: Fonte[];
  disclaimer: string;
  linha_do_tempo: EventoTempo[];
  hash_conteudo: string;
}
