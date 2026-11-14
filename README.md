# Lab Virtual de Hipóteses

> **⚠️ Hipótese computacional educativa. Não é diagnóstico, não é tratamento, não é medicamento aprovado. Não use para automedicação. Validação somente experimental em laboratório.**
>
> Este projeto não trata pessoas, não calcula dose e não recomenda uso de plantas ou compostos. Os números são índices de um modelo simplificado, sem calibração clínica.

## Objetivo

Organizar uma doença **já conhecida** (MVP: diabetes mellitus tipo 2) em um modelo simples de vias (célula + órgão), cruzar com **fichas documentadas** de plantas/compostos e gerar **hipóteses abertas** (PDF + vídeo + JSON com ID público) para laboratórios reais testarem. Projeto independente: não faz parte de nenhum outro app.

## O que está pronto (MVP web)

- 8 abas: Início, Doenças, Natureza, Lab, 3D, Hipóteses, Exportar, Fontes (pt-BR).
- 2 doenças (diabetes tipo 2 e hipertensão essencial), cada uma um arquivo JSON em `data/doencas/` com nós de via, índices derivados, órgãos 3D low-poly procedurais com hotspots, célula 2D e lacunas. Doença nova = arquivo novo, sem mexer no código.
- 7 fichas (berberina, cúrcuma, canela, melão-de-são-caetano, feno-grego, galega, alho), cada uma com fontes. A evidência é declarada por doença (`eixos[].doenca`): o que vale para uma doença não é transferido para outra.
- Match auditável por eixo com confiança forte/médio/fraco e explicação; simulação determinística com seed; faixa de incerteza (p10/p50/p90).
- Camadas (órgão → tecido → célula → via), antes/depois, comparar 2 hipóteses, linha do tempo, ficha do composto em 1 toque, modo "só conhecido" × "mostrar lacunas".
- Exportar PDF, JSON, vídeo (gravado no navegador) e pack ZIP; TTS pt-BR opcional (ver limites).

## Usar sem instalar nada

- **Web**: GitHub Pages (workflow `pages.yml`). Se a página não abrir, ative em Settings → Pages → Source: *GitHub Actions* e rode o workflow de novo.
- **Android**: APK de teste (debug) na Release `apk-latest`: https://github.com/fabiopimentapinto16-ai/lab-virtual-hipoteses/releases/tag/apk-latest (permitir fontes desconhecidas). Arquivos exportados vão para a pasta Downloads.

## Como reproduzir

```bash
npm install
npm test            # domínio, PDF, JSON, ZIP, linguagem proibida
npm run dev         # abre o app
npm run build       # tipos + build em dist/
npm run gerar-exemplo   # regenera exemplos/HYP-2026-001.{json,pdf}
npm run verificar-ids   # confere IDs PubChem na API pública (precisa de internet)
npm run e2e         # Playwright; precisa do app servido (E2E_URL, padrão http://localhost:4173)
```

Mesma seed + mesmas fichas = mesmo resultado e mesmo `hash_conteudo`.

## Formato do JSON da hipótese

Esquema em [`schemas/hipotese.schema.json`](schemas/hipotese.schema.json); exemplo real em [`exemplos/HYP-2026-001.json`](exemplos/HYP-2026-001.json) (+ PDF). Campos principais: `schema_versao`, `id` (HYP-AAAA-NNN), `criada_em`, `doenca`, `itens` (com IDs públicos), `matches` (nível, pontuação, motivos, fontes), `simulacao` (`antes`, `depois`, `deltas`, `incerteza`, `seed`), `pergunta_para_lab`, `alertas`, `limitacoes`, `fontes`, `disclaimer`, `linha_do_tempo`, `hash_conteudo` (SHA-256 do conteúdo sem a linha do tempo). Detalhes em [docs/formato-json.md](docs/formato-json.md).

## Como contribuir com fichas (planta/doença) com fonte

1. Copie uma ficha de `data/naturezas/` e preencha. **Toda ficha precisa de fonte** (`data/fontes.json`: citação, URL https, o que a fonte diz, data de leitura).
2. Para cada eixo, declare `evidencia` e `qualidade` **como a fonte declara**; se a fonte não diz, use `nao_declarada`. Não preencha o que a fonte não informa (`parte_usada` só com `parte_usada_fonte`).
3. Alertas de segurança: `alertas_status` = `avaliado` | `parcial` | `nao_avaliado`. Sem avaliação, a confiança fica limitada a fraca.
4. IDs públicos (PubChem/ChEBI) entram com `verificado: false`; só vira `true` depois de `npm run verificar-ids` e conferência humana.
5. Sem doses, sem instruções de uso, sem promessa de efeito. `npm test` barra linguagem proibida.

## Limites conhecidos (honestidade)

- Hipertensão: só a ficha do alho tem evidência registrada (resumo da meta-análise de Ried 2008; qualidade e números não lidos, confiança fraca). Canela e hibisco aguardam leitura das fontes.

- Vídeo: gravado com MediaRecorder; sai MP4 só se o navegador suportar, senão WebM. A narração TTS é voz ao vivo e **não entra no arquivo** (limite dos navegadores). No Android (futuro) dá para gerar áudio com `TextToSpeech`.
- Estrutura 2D do composto não é embutida (sem rede); a ficha aponta para o PubChem quando há ID.
- Nenhuma ficha atinge confiança "forte": nenhuma fonte lida declara qualidade moderada/alta.
- Android: casca WebView (pasta `android/`) que carrega o mesmo app web offline; APK de depuração gerado pelo CI. Ainda não testado em aparelho real; vídeo e exportação no WebView dependem do aparelho.
- O 3D, o vídeo e o e2e foram validados pelo CI do GitHub, não em dispositivo real.

## Documentação

[docs/motor.md](docs/motor.md) (match e simulação) · [docs/formato-json.md](docs/formato-json.md) · [docs/assets-3d.md](docs/assets-3d.md) (origem/licença dos modelos 3D)

## Changelog

- **0.2.0** — várias doenças por dados (hipertensão), motor e 3D guiados por JSON, esquema JSON 1.1, novo visual.
- **0.1.1** — casca Android (WebView), workflows de Pages e APK, IDs PubChem verificados.
- **0.1.0** — MVP web: T2D, 6 fichas, match auditável, simulação determinística, 3D procedural, PDF/JSON/vídeo/ZIP, CI.

## Licença

MIT — veja [LICENSE](LICENSE).
