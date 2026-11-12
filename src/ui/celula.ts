import type { Doenca, Valores } from "../domain/types.ts";

/** Esquema 2D da célula (SVG) com as variáveis do modelo. Cor e pulsação seguem o desequilíbrio. */
export function celulaSVG(d: Doenca, v: Valores, rotuloCelula = "Célula (esquema do modelo)"): string {
  const ruim = (id: string) => {
    const n = d.nos.find((x) => x.id === id)!;
    const val = v[id] ?? n.saudavel;
    const f = (x: number) => (n.direcao_ruim === "alto" ? x : 100 - x);
    return Math.max(0, Math.min(1, (f(val) - f(n.saudavel)) / Math.max(1, f(n.doenca) - f(n.saudavel))));
  };
  const cor = (r: number) => `hsl(${Math.round(170 - 170 * r)} 62% 46%)`;
  const org = (id: string, x: number, y: number, rx: number, ry: number, nome: string) => {
    const r = ruim(id);
    return `<g><ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${cor(r)}" stroke="#fff" stroke-width="1.5"><animate attributeName="rx" values="${rx};${rx * (1 + 0.06 * r + 0.01)};${rx}" dur="${(2.4 - 1.4 * r).toFixed(2)}s" repeatCount="indefinite"/></ellipse><text x="${x}" y="${y + ry + 14}" text-anchor="middle" font-size="11" fill="currentColor">${nome}: ${Math.round(v[id] ?? 0)}</text></g>`;
  };
  return `<svg viewBox="0 0 400 300" role="img" aria-label="Esquema 2D da célula com as variáveis do modelo" class="cel2d">
  <ellipse cx="200" cy="150" rx="185" ry="135" fill="rgba(143,211,200,.12)" stroke="currentColor" stroke-width="2"/>
  <text x="200" y="22" text-anchor="middle" font-size="12" fill="currentColor">${rotuloCelula}</text>
  <ellipse cx="200" cy="105" rx="46" ry="32" fill="#6b6fb5" opacity=".75"/><text x="200" y="108" text-anchor="middle" font-size="10" fill="#fff">núcleo</text>
  ${org("oxi", 95, 130, 30, 18, "Mitocôndria · estresse ox.")}
  ${org("beta", 305, 130, 30, 22, "Grânulos de insulina · função β")}
  ${org("ri", 90, 215, 26, 16, "Receptor de insulina · resistência")}
  ${org("upt", 200, 235, 26, 16, "Transportador de glicose · captação")}
  ${org("inf", 310, 215, 26, 16, "Sinais inflamatórios")}
  ${org("hgp", 200, 175, 22, 14, "Via hepática de glicose")}
  </svg>`;
}
