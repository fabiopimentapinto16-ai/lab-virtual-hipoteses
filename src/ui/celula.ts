import type { Doenca, OrgaoModelo, Valores } from "../domain/types.ts";

/** Esquema 2D da célula (SVG), montado a partir de `orgao.celula_svg`. Cor e pulsação seguem o desequilíbrio da variável. */
export function celulaSVG(d: Doenca, orgao: OrgaoModelo, v: Valores): string {
  const ruim = (id: string) => {
    const n = d.nos.find((x) => x.id === id);
    if (!n) return 0;
    const val = v[id] ?? n.saudavel;
    const f = (x: number) => (n.direcao_ruim === "alto" ? x : 100 - x);
    return Math.max(0, Math.min(1, (f(val) - f(n.saudavel)) / Math.max(1, f(n.doenca) - f(n.saudavel))));
  };
  const cor = (r: number) => `hsl(${Math.round(170 - 170 * r)} 62% 46%)`;
  const org = (e: OrgaoModelo["celula_svg"]["elementos"][number]) => {
    const r = ruim(e.no);
    return `<g><ellipse cx="${e.x}" cy="${e.y}" rx="${e.rx}" ry="${e.ry}" fill="${cor(r)}" stroke="#fff" stroke-width="1.5"><animate attributeName="rx" values="${e.rx};${e.rx * (1 + 0.06 * r + 0.01)};${e.rx}" dur="${(2.4 - 1.4 * r).toFixed(2)}s" repeatCount="indefinite"/></ellipse><text x="${e.x}" y="${e.y + e.ry + 14}" text-anchor="middle" font-size="10.5" fill="currentColor">${e.rotulo}: ${Math.round(v[e.no] ?? 0)}</text></g>`;
  };
  return `<svg viewBox="0 0 400 300" role="img" aria-label="Esquema 2D da célula com as variáveis do modelo" class="cel2d">
  <ellipse cx="200" cy="150" rx="185" ry="135" fill="rgba(143,211,200,.12)" stroke="currentColor" stroke-width="2"/>
  <text x="200" y="22" text-anchor="middle" font-size="12" fill="currentColor">${orgao.celula_svg.titulo}</text>
  <ellipse cx="200" cy="85" rx="46" ry="30" fill="#6b6fb5" opacity=".75"/><text x="200" y="88" text-anchor="middle" font-size="10" fill="#fff">núcleo</text>
  ${orgao.celula_svg.elementos.map(org).join("\n  ")}
  </svg>`;
}
