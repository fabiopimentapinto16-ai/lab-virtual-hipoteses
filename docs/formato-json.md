# Formato JSON da hipótese (schema_versao 1.1)

Validado por [`schemas/hipotese.schema.json`](../schemas/hipotese.schema.json). Exemplo: [`exemplos/HYP-2026-001.json`](../exemplos/HYP-2026-001.json).

- `intensidades`: % do efeito de referência de cada item no modelo (padrão 100, máximo 200; acima de 100 o ganho é decrescente). É um parâmetro do modelo, **não é dose**.
- `variaveis`: lista `{id, nome, tipo}` das variáveis do modelo da doença (nós e índices), com nomes legíveis para PDF e tabelas.
- `id`: `HYP-AAAA-NNN`, sequencial por ano no armazenamento local.
- `simulacao.antes/depois/deltas`: índices do modelo (0–100); `incerteza`: p10/p50/p90 dos deltas de `gj`, `gp`, `razao_ri_beta`.
- `matches[].nivel`: `forte` | `medio` | `fraco`; `motivos` explica a pontuação.
- `linha_do_tempo[].estado`: `criada` → `publicada` → `lab_testou` → `resultado` (só avança nessa ordem).
- `hash_conteudo`: verifica integridade do conteúdo; a linha do tempo pode crescer sem alterar o hash.
- `disclaimer`: sempre o texto completo exigido.
