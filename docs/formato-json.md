# Formato JSON da hipótese (schema_versao 1.0)

Validado por [`schemas/hipotese.schema.json`](../schemas/hipotese.schema.json). Exemplo: [`exemplos/HYP-2026-001.json`](../exemplos/HYP-2026-001.json).

- `id`: `HYP-AAAA-NNN`, sequencial por ano no armazenamento local.
- `simulacao.antes/depois/deltas`: índices do modelo (0–100); `incerteza`: p10/p50/p90 dos deltas de `gj`, `gp`, `razao_ri_beta`.
- `matches[].nivel`: `forte` | `medio` | `fraco`; `motivos` explica a pontuação.
- `linha_do_tempo[].estado`: `criada` → `publicada` → `lab_testou` → `resultado` (só avança nessa ordem).
- `hash_conteudo`: verifica integridade do conteúdo; a linha do tempo pode crescer sem alterar o hash.
- `disclaimer`: sempre o texto completo exigido.
