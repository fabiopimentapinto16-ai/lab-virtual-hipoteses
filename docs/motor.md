# Motor de match e simulação

## Modelo (T2D, v0.1.0)
Nós primários (0–100, índice do modelo): `ri` resistência à insulina, `beta` função beta, `hgp` produção hepática de glicose, `upt` captação periférica, `inf` inflamação, `oxi` estresse oxidativo. Perfis de referência: saudável (ri25 beta85 hgp30 upt80 inf20 oxi20) e doença genérica (ri75 beta45 hgp75 upt40 inf65 oxi60) — ilustrativos.

Derivados (coeficientes em `data/doencas/diabetes-tipo-2.json`):
- `ri_ef = ri + 0.15·(inf − inf_s) + 0.10·(oxi − oxi_s)`
- `hgp_ef = hgp + 0.20·(ri_ef − ri_s)`
- `gj = 20 + 0.45·hgp_ef + 0.25·(100 − beta) + 0.15·ri_ef` (índice de jejum)
- `gp = 15 + 0.35·(100 − upt) + 0.30·(100 − beta) + 0.20·ri_ef` (índice pós-prandial)
- `razao_ri_beta = 100·ri_ef / beta` (**padrão em teste**, sem valor clínico)

## Match (por eixo)
Um eixo da ficha só entra se a variável-alvo está desregulada no modelo (diferença ≥ 10 entre saudável e doença).
`pontuação = max(0, pontos_evidência + ajuste_qualidade) × (0,5 + 0,5 × completude)`
- Evidência: meta-análise humana 3; revisão de ensaios 2,5; ensaio único 2; mecanismo em revisão 1,5; animal 1,5; in vitro 1; histórico 0,5.
- Qualidade declarada: alta +0,5; moderada 0; baixa −0,5; não declarada −0,5; muito baixa −1.
- Completude: fonte citada 0,4; detalhe do achado 0,2; segurança avaliada 0,2 (parcial 0,1); ID público verificado 0,1; parte usada 0,1.
- Nível: **forte** ≥ 2,5 com qualidade alta/moderada; **médio** ≥ 1,5; senão **fraco**. Tetos: segurança não avaliada ⇒ fraco; qualidade muito baixa ⇒ fraco.
Cada match grava os `motivos` com as contas.

## Simulação
`estado_antes → modulação → estado_depois`. Cada match contribui `delta_do_eixo × fator_confiança` (forte 1,0; médio 0,6; fraco 0,3). Mesmo eixo vindo de vários itens: maior efeito + 25 % da soma dos demais. Variação por variável limitada a ±25. Eixos de mecanismo mudam nós; eixos de desfecho mudam só os índices derivados.
Incerteza: 500 amostras com PRNG `mulberry32` (seed fixa) multiplicando cada efeito por uma faixa que depende da confiança; reporta p10/p50/p90. O resultado nominal não depende da seed.
`hash_conteudo` = SHA-256 do JSON canônico (chaves ordenadas), sem `linha_do_tempo` e sem o próprio hash.

## Intensidade relativa (parâmetro do modelo)
Cada item pode ser simulado de 0 a 200 % do efeito de referência da ficha. Até 100 % o efeito é proporcional; acima, cada ponto extra vale 25 % (saturação). Não há unidade de massa nem de concentração: o número **não é dose** e não se traduz para pessoas. A curva de resposta mostra como o índice muda quando todos os itens escalam juntos.
