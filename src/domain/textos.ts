/** Textos fixos. O disclaimer é o texto exigido, igual em UI, PDF, MP4 e JSON. */
export const DISCLAIMER_COMPLETO =
  "Hipótese computacional educativa. Não é diagnóstico, não é tratamento, não é medicamento aprovado. " +
  "Não use para automedicação. Validação somente experimental em laboratório.";

export const DISCLAIMER_CURTO = "Hipótese computacional educativa. Não é diagnóstico nem tratamento. Validação somente em laboratório.";

export const AVISO_MODELO =
  "Os valores são índices do modelo (0 a 100), qualitativos e sem calibração clínica. Não representam glicemia nem nenhuma medida de pessoas.";

export const O_QUE_E = [
  "Um laboratório virtual de estudo: organiza uma doença conhecida em um modelo simples, cruza com fichas documentadas de plantas e compostos e gera hipóteses abertas para laboratórios reais testarem.",
  "Cada ficha cita a fonte de onde veio. Onde a fonte não diz algo, o app escreve \"não avaliado\" em vez de preencher.",
];

export const O_QUE_NAO_E = [
  "Não é diagnóstico, não é tratamento e não é recomendação de uso de planta, composto ou medicamento.",
  "Não trata pessoas, não calcula dose e não substitui ensaio laboratorial nem clínico.",
  "Não usa dados de pacientes: o modelo é um perfil genérico e ilustrativo da doença.",
];

export const LIMITACOES_PADRAO = [
  "Modelo qualitativo e simplificado, com perfil genérico da doença; os coeficientes não foram calibrados com dados clínicos.",
  "O nível de confiança do match reflete o tipo e a qualidade da evidência declarada nas fichas e a completude da ficha; não é certeza clínica.",
  "Fichas refletem o que as fontes citadas dizem; podem estar desatualizadas ou incompletas.",
  "Resultados de simulação em índices do modelo não se transferem para pessoas.",
];

/** Padrões que NUNCA podem aparecer em texto de ficha, resultado, PDF, JSON ou vídeo. */
export const PADROES_PROIBIDOS: { nome: string; re: RegExp }[] = [
  { nome: "imperativo de uso", re: /\b(tome|tomar|ingira|ingerir|beba|consuma|use)\s+(esta|essa|este|esse|o|a|os|as|\d)/i },
  { nome: "dose para pessoa", re: /\b\d+([.,]\d+)?\s*(mg|g|ml|mcg|µg)\b[^.]{0,40}\b(por dia|ao dia|diári[oa]s?|por kg)/i },
  { nome: "promessa de cura", re: /cura\s+(garantida|definitiva|o diabetes|a diabetes)|\bcurar\s+(o|a)\s+diabetes/i },
  { nome: "tratamento afirmado", re: /\b(trata|tratar|tratamento)\s+(o |a |de )?diabetes/i },
  { nome: "substituição de medicamento", re: /substitu\w+\s+(o\s+)?(medicamento|rem[eé]dio|insulina|metformina)/i },
  { nome: "receita caseira", re: /receita caseira|rem[eé]dio caseiro|chá para diabetes/i },
];

export function violacoes(texto: string): string[] {
  return PADROES_PROIBIDOS.filter((p) => p.re.test(texto)).map((p) => p.nome);
}
