# Assets 3D: origem e licença

## Anatomia real (Atlas e órgãos das doenças)

Os órgãos reais vêm do **HuBMAP CCF 3D Reference Object Library v1.2**, licença **CC BY 4.0**.

- Citação: Browne, Schlehlein, Herr II, Quardokus, Bueckle, Börner (2022). *HuBMAP CCF 3D Reference Object Library*. https://hubmapconsortium.github.io/ccf/pages/ccf-3d-reference-library.html
- Origem dos arquivos: repositório `hubmapconsortium/ccf-releases`, pasta `v1.2/models` (GLB).
- Alterações: nenhuma na malha. O app só centraliza, escala e colore em tempo de execução.
- Conjunto incluído (`public/modelos/`, 31 arquivos, ~80 MB): cérebro, coração, pulmões, fígado, pâncreas, rins, baço, timo, intestinos, bexiga, ureteres, uretra, próstata, olhos, vasos sanguíneos, pele, medula espinhal, linfonodo, pelve, joelhos, útero, ovários, tubas, placenta. Versão masculina quando existe nos dois sexos; órgãos femininos só em versão feminina. Os arquivos "United" (corpo inteiro, ZIP) não foram incluídos.
- Prefixos dos arquivos (VH, Allen, NIH, SBU) indicam o grupo de origem de cada modelo; ver a página do HuBMAP.

### Onde o modelo de doença usa a malha real

| Órgão | Arquivo | Regiões do modelo ← estruturas do GLB |
|---|---|---|
| Pâncreas (DM2) | VH_M_Pancreas | cabeça ← head, uncinate; corpo ← body, neck; cauda ← tail; ilhotas = pontos **ilustrativos** sobre corpo e cauda |
| Fígado (DM2) | VH_M_Liver | lobo direito ← segmentos right_*, caudado; lobo esquerdo ← segmentos left_*, quadrado (agrupamento simplificado) |
| Rim (hipertensão) | VH_M_Kidney_L | córtex ← outer cortex, colunas; medula ← pirâmides, papilas; justaglomerular ← hilo (**marcador aproximado**: o aparelho justaglomerular é microscópico) |

Estruturas do GLB sem região no mapa ficam ocultas. Se o GLB não carregar, o app usa o órgão procedural.
Artéria (hipertensão), tumor e microambiente (câncer), célula e grafo de via continuam procedurais (Three.js, MIT).

### Limites

- O Atlas mostra anatomia. Só pâncreas, fígado e rim esquerdo têm coloração de doença; os demais não têm modelo de doença ainda.
- Modelo de referência de um corpo, não imagem de paciente.
- As cores de doença vêm do modelo simplificado do app, não de imagem real de lesão.

## Procedurais

Biblioteca: [three.js](https://threejs.org) (MIT). Formas primitivas em `src/ui/organ3d.ts`.
