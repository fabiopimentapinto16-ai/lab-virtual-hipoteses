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
export interface ParteModelo3D {
  hotspot: string;
  forma: "esfera" | "tubo" | "cone" | "nuvem";
  pos?: [number, number, number];
  esc?: [number, number, number];
  raio?: number;
  altura?: number;
  rot_z?: number;
  pontos?: [number, number, number][];
  /** nuvem: pequenas esferas distribuídas ao longo do tubo (id do hotspot do tubo). */
  ao_longo_de?: string;
  n?: number;
}
export interface ElementoCelula { no: string; x: number; y: number; rx: number; ry: number; rotulo: string }
export interface OrgaoModelo {
  id: string; nome: string; tecido: string; celula: string; nos: string[]; hotspots: Hotspot[];
  modelo3d: ParteModelo3D[];
  celula_svg: { titulo: string; elementos: ElementoCelula[] };
}

export interface TermoDerivado { de: string; peso: number; modo: "valor" | "inverso" | "desvio_ref" }
/** Variável calculada a partir dos nós (linear, auditável). `razao` cria um índice composto num/den. */
export interface Derivado {
  id: string; nome: string; camada: Camada; descricao?: string;
  base?: number; termos?: TermoDerivado[]; limitar?: boolean;
  razao?: { num: string; den: string; mult: number };
  exibir?: boolean; incerteza?: boolean; fontes?: string[];
}

export interface EixoDef {
  id: string;
  nome: string;
  tipo: "mecanismo" | "desfecho";
  alvo: string | string[];
  delta: number;
}

export interface Coeficientes {
  descricao: string;
  limite_delta_por_variavel: number;
  [chave: string]: unknown;
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
  /** Aviso extra exibido na doença, no PDF e na lista de limitações (opcional). */
  aviso?: string;
  orgaos: OrgaoModelo[];
  nos: NoModelo[];
  lacunas: Lacuna[];
  indicadores: { id: string; nome: string; unidade: string; fontes: string[] }[];
  equacoes: Coeficientes;
  derivados: Derivado[];
  ligacoes_via: [string, string][];
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
  /** Doença para a qual esta evidência vale (a evidência de uma doença não se transfere para outra). */
  doenca: string;
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
  schema_versao: "1.1";
  id: string;
  criada_em: string;
  app_versao: string;
  doenca: { id: string; nome: string; versao_modelo: string; perfil: string };
  itens: { ficha_id: string; nome: string; nome_cientifico: string; compostos: { nome: string; id_publico: IdPublico | null }[] }[];
  matches: Match[];
  /** % do efeito de referência de cada item no modelo (100 = referência). Parâmetro do modelo, não é dose. */
  intensidades: Record<string, number>;
  variaveis: { id: string; nome: string; tipo: "no" | "derivado" }[];
  simulacao: ResultadoSimulacao;
  pergunta_para_lab: string;
  alertas: string[];
  limitacoes: string[];
  fontes: Fonte[];
  disclaimer: string;
  linha_do_tempo: EventoTempo[];
  hash_conteudo: string;
}
