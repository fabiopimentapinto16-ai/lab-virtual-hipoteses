import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { Doenca, OrgaoModelo, Valores } from "../domain/types.ts";

export type Camada3D = 0 | 1 | 2 | 3; // órgão, tecido, célula, via molecular
export const NOMES_CAMADA = ["Órgão", "Tecido (conceitual)", "Célula", "Via molecular"];

const BOM = new THREE.Color(0x2bb3a3);
const RUIM = new THREE.Color(0xd9483b);
const CINZA = new THREE.Color(0x8a8f98);
const INTERV = new THREE.Color(0x35c4ff);

function rotulo(texto: string): THREE.Sprite {
  const c = document.createElement("canvas"); c.width = 512; c.height = 96;
  const g = c.getContext("2d")!; g.fillStyle = "rgba(10,20,28,0.78)"; g.fillRect(0, 0, 512, 96);
  g.fillStyle = "#fff"; g.font = "bold 34px sans-serif"; g.textBaseline = "middle"; g.fillText(texto.slice(0, 30), 14, 48);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false }));
  s.scale.set(2.4, 0.45, 1); s.renderOrder = 10; return s;
}

export interface InfoHotspot { id: string; nome: string; nos: string[] }

/** Cena 3D procedural low-poly (sem arquivos de modelo externos): pâncreas e fígado. */
export class Organ3D {
  readonly canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private raycaster = new THREE.Raycaster();
  private organGroup = new THREE.Group();
  private extraGroup = new THREE.Group();
  private ghostGroup = new THREE.Group();
  private fluxo = new THREE.Group();
  private hot = new Map<string, THREE.Mesh>();
  private orgaoId: string;
  private camada: Camada3D = 0;
  private lacunas = true;
  private antes: Valores = {};
  private depois: Valores = {};
  private t = 1;
  private fluxoT = -1;
  private raf = 0;
  private selecionado: string | null = null;
  onHotspot: (h: InfoHotspot | null) => void = () => {};

  constructor(private el: HTMLElement, private doenca: Doenca, largura?: number, altura?: number, preservar = false) {
    this.orgaoId = doenca.orgaos[0].id;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: preservar });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.canvas = this.renderer.domElement;
    el.appendChild(this.canvas);
    const w = largura ?? el.clientWidth ?? 600, h = altura ?? el.clientHeight ?? 400;
    this.renderer.setSize(w, h, false);
    this.canvas.style.width = largura ? `${largura}px` : "100%"; this.canvas.style.height = altura ? `${altura}px` : "100%";
    this.camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 100);
    this.camera.position.set(0, 1.2, 7);
    this.scene.background = new THREE.Color(0x0c1a22);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dl = new THREE.DirectionalLight(0xffffff, 1.1); dl.position.set(3, 5, 4); this.scene.add(dl);
    this.scene.add(this.organGroup, this.extraGroup, this.ghostGroup, this.fluxo);
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.canvas.addEventListener("pointerdown", (e) => this.clique(e));
    this.construir();
    this.loop();
  }

  private loop = () => {
    this.raf = requestAnimationFrame(this.loop);
    this.animar(performance.now() / 1000);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };
  render() { this.animar(performance.now() / 1000); this.renderer.render(this.scene, this.camera); }
  redimensionar(w: number, h: number) { this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }
  dispose() { cancelAnimationFrame(this.raf); this.controls.dispose(); this.renderer.dispose(); this.canvas.remove(); }

  setOrgao(id: string) { if (id === this.orgaoId) return; this.orgaoId = id; this.selecionado = null; this.construir(); }
  setCamada(c: Camada3D) { if (c === this.camada) return; this.camada = c; this.construir(); }
  setLacunas(v: boolean) { if (v === this.lacunas) return; this.lacunas = v; this.construir(); }
  setValores(antes: Valores, depois: Valores, t: number) { this.antes = antes; this.depois = depois; this.t = t; this.colorir(); }
  getOrgao() { return this.orgaoId; }
  iniciarFluxo() { this.fluxoT = 0; }
  setCamera(az: number) { this.camera.position.set(Math.sin(az) * 7, 1.2, Math.cos(az) * 7); this.camera.lookAt(0, 0, 0); }

  private valorNo(id: string): number {
    const a = this.antes[id], d = this.depois[id];
    if (a === undefined) return this.doenca.nos.find((n) => n.id === id)?.doenca ?? 50;
    return a + ((d ?? a) - a) * this.t;
  }
  private ruim(id: string): number {
    const n = this.doenca.nos.find((x) => x.id === id);
    if (!n) return 0;
    const v = this.valorNo(id);
    const r = n.direcao_ruim === "alto" ? v : 100 - v;
    const rS = n.direcao_ruim === "alto" ? n.saudavel : 100 - n.saudavel;
    const rD = n.direcao_ruim === "alto" ? n.doenca : 100 - n.doenca;
    return Math.max(0, Math.min(1, (r - rS) / Math.max(1, rD - rS)));
  }
  private mudou(id: string): boolean { return Math.abs((this.depois[id] ?? 0) - (this.antes[id] ?? 0)) > 0.5 && this.t > 0.05; }

  private limpar(g: THREE.Group) {
    for (const c of [...g.children]) { g.remove(c); c.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose?.(); const mt = m.material as THREE.Material | THREE.Material[] | undefined; if (Array.isArray(mt)) mt.forEach((x) => x.dispose()); else mt?.dispose?.(); }); }
  }
  private hotMesh(id: string, geo: THREE.BufferGeometry, pos: [number, number, number], esc: [number, number, number] = [1, 1, 1]): THREE.Mesh {
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: BOM, roughness: 0.55, flatShading: true }));
    m.position.set(...pos); m.scale.set(...esc); m.userData.hot = id; this.hot.set(id, m); return m;
  }

  private construir() {
    this.limpar(this.organGroup); this.limpar(this.extraGroup); this.limpar(this.ghostGroup); this.hot.clear();
    const o = this.doenca.orgaos.find((x) => x.id === this.orgaoId) ?? this.doenca.orgaos[0];
    const cam = this.camada;
    if (cam === 0 || cam === 1) {
      this.partes(o);
      if (cam === 1) {
        this.organGroup.traverse((c) => { const m = c as THREE.Mesh; if (m.isMesh) { const mt = m.material as THREE.MeshStandardMaterial; mt.transparent = true; mt.opacity = 0.28; } });
        const pts: number[] = []; let s = 7;
        const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
        for (let i = 0; i < 700; i++) pts.push((rnd() - 0.5) * 5, (rnd() - 0.5) * 1.6, (rnd() - 0.5) * 1.4);
        const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
        this.extraGroup.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xbfe8e2, size: 0.05 })));
        const t = rotulo(`Tecido: ${o.tecido}`); t.position.set(0, 1.5, 0); this.extraGroup.add(t);
      }
    } else if (cam === 2) {
      this.celula3d(o.celula, o.nos);
    } else {
      this.via3d(o.nos);
    }
    if (cam < 2 && this.lacunas) this.fantasmas();
    this.colorir();
  }

  /** Monta o órgão a partir de `orgao.modelo3d` (formas primitivas; nenhum arquivo de modelo externo). */
  private partes(o: OrgaoModelo) {
    const curvas = new Map<string, THREE.CatmullRomCurve3>();
    for (const p of o.modelo3d) {
      if (p.forma === "esfera") {
        this.organGroup.add(this.hotMesh(p.hotspot, new THREE.SphereGeometry(p.raio ?? 1, 12, 9), p.pos ?? [0, 0, 0], p.esc ?? [1, 1, 1]));
      } else if (p.forma === "tubo") {
        const c = new THREE.CatmullRomCurve3((p.pontos ?? []).map((q) => new THREE.Vector3(q[0], q[1], q[2])));
        curvas.set(p.hotspot, c);
        this.organGroup.add(this.hotMesh(p.hotspot, new THREE.TubeGeometry(c, 12, p.raio ?? 0.3, 8, false), [0, 0, 0]));
      } else if (p.forma === "cone") {
        const m = this.hotMesh(p.hotspot, new THREE.ConeGeometry(p.raio ?? 0.3, p.altura ?? 1, 8), p.pos ?? [0, 0, 0]);
        m.rotation.z = p.rot_z ?? 0;
        this.organGroup.add(m);
      } else {
        const c = curvas.get(p.ao_longo_de ?? "");
        if (!c) continue;
        const n = p.n ?? 10;
        const g = new THREE.Group(); g.userData.hot = p.hotspot;
        for (let i = 0; i < n; i++) {
          const q = c.getPoint(n > 1 ? i / (n - 1) : 0);
          const s = new THREE.Mesh(new THREE.IcosahedronGeometry(p.raio ?? 0.1, 0), new THREE.MeshStandardMaterial({ color: BOM, flatShading: true }));
          s.position.set(q.x, q.y + 0.36, q.z + 0.08); s.userData.hot = p.hotspot; g.add(s);
        }
        this.organGroup.add(g);
      }
    }
  }
  private fantasmas() {
    const lac = this.doenca.lacunas.filter((l) => l.camada === "lacuna");
    lac.forEach((l, i) => {
      const a = (i / lac.length) * Math.PI * 2;
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.25, 0), new THREE.MeshBasicMaterial({ color: CINZA, transparent: true, opacity: 0.55, wireframe: true }));
      m.position.set(Math.cos(a) * 3.3, Math.sin(a) * 1.6 - 0.3, -0.5);
      const t = rotulo(`${l.nome} (lacuna)`); t.position.set(m.position.x, m.position.y + 0.45, m.position.z);
      this.ghostGroup.add(m, t);
    });
  }
  private celula3d(nomeCelula: string, nos: string[]) {
    const mem = new THREE.Mesh(new THREE.SphereGeometry(1.7, 16, 12), new THREE.MeshStandardMaterial({ color: 0x8fd3c8, transparent: true, opacity: 0.25, flatShading: true }));
    this.extraGroup.add(mem);
    const nuc = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 10), new THREE.MeshStandardMaterial({ color: 0x6b6fb5, flatShading: true })); nuc.position.set(-0.3, 0.2, 0); this.extraGroup.add(nuc);
    nos.forEach((id, i) => {
      const a = (i / nos.length) * Math.PI * 2;
      const m = this.hotMesh(id, new THREE.SphereGeometry(0.28, 10, 8), [Math.cos(a) * 1.1 + 0.2, Math.sin(a) * 1.0, 0.3]);
      m.userData.no = id; this.organGroup.add(m);
      const n = this.doenca.nos.find((x) => x.id === id)!; const t = rotulo(n.nome); t.position.set(m.position.x, m.position.y + 0.5, 0.4); this.extraGroup.add(t);
    });
    const t = rotulo(`Célula: ${nomeCelula}`); t.position.set(0, -2.1, 0); this.extraGroup.add(t);
  }
  private via3d(nos: string[]) {
    const pos: Record<string, [number, number, number]> = {};
    nos.forEach((id, i) => { const a = (i / nos.length) * Math.PI * 2; pos[id] = [Math.cos(a) * 2.2, Math.sin(a) * 1.5, 0]; });
    for (const [a, b] of this.doenca.ligacoes_via) if (pos[a] && pos[b]) {
      const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...pos[a]), new THREE.Vector3(...pos[b])]);
      this.extraGroup.add(new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0x7aa7b5 })));
    }
    for (const id of nos) {
      const m = this.hotMesh(id, new THREE.OctahedronGeometry(0.3, 0), pos[id]); m.userData.no = id; this.organGroup.add(m);
      const n = this.doenca.nos.find((x) => x.id === id)!; const t = rotulo(`${n.nome} (${Math.round(this.valorNo(id))})`); t.position.set(pos[id][0], pos[id][1] + 0.55, 0.2); this.extraGroup.add(t);
    }
  }

  private colorir() {
    for (const [id, m] of this.hot) {
      const o = this.doenca.orgaos.find((x) => x.id === this.orgaoId)!;
      const nosIds = (this.camada >= 2) ? [id] : (o.hotspots.find((h) => h.id === id)?.nos ?? []);
      const r = nosIds.length ? nosIds.reduce((s, n) => s + this.ruim(n), 0) / nosIds.length : 0;
      const cor = BOM.clone().lerp(RUIM, r);
      const interv = nosIds.some((n) => this.mudou(n));
      const aplicar = (mt: THREE.MeshStandardMaterial) => { mt.color.copy(cor); mt.emissive.copy(interv ? INTERV : new THREE.Color(id === this.selecionado ? 0x444444 : 0x000000)); mt.emissiveIntensity = interv ? 0.35 : 1; };
      aplicar(m.material as THREE.MeshStandardMaterial);
      if (m.type === "Group") m.children.forEach((c) => aplicar((c as THREE.Mesh).material as THREE.MeshStandardMaterial));
    }
    this.organGroup.children.forEach((g) => { if (g.type === "Group") g.children.forEach((c) => { const m = c as THREE.Mesh; if (m.userData.hot) { const mt = m.material as THREE.MeshStandardMaterial; const o = this.doenca.orgaos.find((x) => x.id === this.orgaoId)!; const nos = o.hotspots.find((h) => h.id === m.userData.hot)?.nos ?? []; const r = nos.reduce((s, n) => s + this.ruim(n), 0) / Math.max(1, nos.length); mt.color.copy(BOM.clone().lerp(RUIM, r)); if (nos.some((n) => this.mudou(n))) { mt.emissive.copy(INTERV); mt.emissiveIntensity = 0.35; } else mt.emissive.set(0x000000); } }); });
  }

  private animar(t: number) {
    this.organGroup.rotation.y = this.camada >= 2 ? Math.sin(t * 0.3) * 0.15 : 0;
    // pulso proporcional ao desequilíbrio
    for (const [id, m] of this.hot) { const o = this.doenca.orgaos.find((x) => x.id === this.orgaoId)!; const nos = this.camada >= 2 ? [id] : (o.hotspots.find((h) => h.id === id)?.nos ?? []); const r = nos.length ? nos.reduce((s, n) => s + this.ruim(n), 0) / nos.length : 0; if (m.type === "Mesh") m.scale.setScalar(1 + Math.sin(t * 3 + m.position.x) * 0.025 * r); }
    // fluxo composto -> alvo
    if (this.fluxoT >= 0) {
      this.fluxoT += 0.012; this.limpar(this.fluxo);
      const alvos = [...this.hot.entries()].filter(([id]) => { const o = this.doenca.orgaos.find((x) => x.id === this.orgaoId)!; const nos = this.camada >= 2 ? [id] : (o.hotspots.find((h) => h.id === id)?.nos ?? []); return nos.some((n) => this.mudou(n)); });
      for (const [, m] of alvos) for (let k = 0; k < 5; k++) {
        const u = (this.fluxoT * 1.2 + k / 5) % 1; const ini = new THREE.Vector3(-4, 2.6, 1); const fim = m.position.clone();
        const p = ini.lerp(fim, u); const s = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 5), new THREE.MeshBasicMaterial({ color: INTERV })); s.position.copy(p); this.fluxo.add(s);
      }
      if (this.fluxoT > 3) { this.fluxoT = -1; this.limpar(this.fluxo); }
    }
  }

  private clique(e: PointerEvent) {
    const r = this.canvas.getBoundingClientRect();
    const p = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(p, this.camera);
    const hit = this.raycaster.intersectObjects(this.organGroup.children, true)[0];
    const id = hit ? (hit.object.userData.hot as string | undefined) : undefined;
    this.selecionado = id ?? null; this.colorir();
    if (!id) { this.onHotspot(null); return; }
    const o = this.doenca.orgaos.find((x) => x.id === this.orgaoId)!;
    const h = o.hotspots.find((x) => x.id === id);
    if (h) this.onHotspot(h);
    else { const n = this.doenca.nos.find((x) => x.id === id); this.onHotspot(n ? { id, nome: n.nome, nos: [id] } : null); }
  }
}
