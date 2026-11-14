import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { carregarGLB } from "./organ3d.ts";
import { nomeEstrutura, type OrgaoAtlas } from "../domain/atlas.ts";

/** Visualizador de anatomia real (GLB do HuBMAP CCF). Só anatomia: sem cores de doença. */
export class AtlasViewer {
  private renderer = new THREE.WebGLRenderer({ antialias: true });
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  private controls: OrbitControls;
  private ray = new THREE.Raycaster();
  private raiz = new THREE.Group();
  private raf = 0;
  private sel: THREE.Mesh | null = null;
  private opac = 1;
  onEstrutura: (nome: string | null) => void = () => {};
  onEstado: (e: "carregando" | "ok" | "erro", msg?: string) => void = () => {};

  constructor(private el: HTMLElement) {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(this.renderer.domElement);
    const c = this.renderer.domElement; c.style.width = "100%"; c.style.height = "100%";
    this.camera.position.set(0, 0.6, 7);
    this.scene.background = new THREE.Color(0x0c1a22);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.8), this.raiz);
    const dl = new THREE.DirectionalLight(0xffffff, 1.2); dl.position.set(3, 5, 4); this.scene.add(dl);
    const dl2 = new THREE.DirectionalLight(0x99ccff, 0.5); dl2.position.set(-4, -2, -3); this.scene.add(dl2);
    this.controls = new OrbitControls(this.camera, c); this.controls.enableDamping = true;
    c.addEventListener("pointerdown", (e) => this.clique(e));
    this.redimensionar(); new ResizeObserver(() => this.redimensionar()).observe(el);
    const loop = () => { this.raf = requestAnimationFrame(loop); this.controls.update(); this.renderer.render(this.scene, this.camera); };
    loop();
  }
  private redimensionar() { const w = this.el.clientWidth || 600, h = this.el.clientHeight || 400; this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }
  dispose() { cancelAnimationFrame(this.raf); this.controls.dispose(); this.renderer.dispose(); this.renderer.domElement.remove(); }

  async mostrar(o: OrgaoAtlas) {
    this.onEstado("carregando");
    try {
      const gltfs = await Promise.all(o.arquivos.map((a) => carregarGLB(a)));
      for (const c of [...this.raiz.children]) this.raiz.remove(c);
      const base = new THREE.Group();
      for (const g of gltfs) {
        const r = g.scene.clone(true); r.updateMatrixWorld(true);
        r.traverse((x) => {
          const m = x as THREE.Mesh; if (!m.isMesh) return;
          const orig = m.material as THREE.MeshStandardMaterial;
          const cor = orig.color ? orig.color.clone() : new THREE.Color(0xc98f85);
          const n = new THREE.Mesh(m.geometry, new THREE.MeshStandardMaterial({ color: cor, roughness: 0.55, metalness: 0.05, side: THREE.DoubleSide, transparent: true, opacity: this.opac }));
          n.applyMatrix4(m.matrixWorld); n.name = m.name; base.add(n);
        });
      }
      const caixa = new THREE.Box3().setFromObject(base); const c = caixa.getCenter(new THREE.Vector3()); const t = caixa.getSize(new THREE.Vector3());
      const esc = 4.6 / Math.max(t.x, t.y, t.z, 1e-6);
      base.position.set(-c.x * esc, -c.y * esc, -c.z * esc); base.scale.setScalar(esc);
      this.raiz.add(base); this.sel = null; this.onEstrutura(null);
      this.onEstado("ok", `${base.children.length} estruturas`);
    } catch (e) { this.onEstado("erro", e instanceof Error ? e.message : String(e)); }
  }
  setOpacidade(v: number) { this.opac = v; this.raiz.traverse((x) => { const m = x as THREE.Mesh; if (m.isMesh) { (m.material as THREE.MeshStandardMaterial).opacity = v; (m.material as THREE.MeshStandardMaterial).depthWrite = v > 0.9; } }); }
  private clique(e: PointerEvent) {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), this.camera);
    const hit = this.ray.intersectObjects(this.raiz.children, true)[0];
    if (this.sel) (this.sel.material as THREE.MeshStandardMaterial).emissive.set(0x000000);
    this.sel = (hit?.object as THREE.Mesh) ?? null;
    if (this.sel) (this.sel.material as THREE.MeshStandardMaterial).emissive.set(0x35c4ff).multiplyScalar(0.5);
    this.onEstrutura(this.sel ? nomeEstrutura(this.sel.name) : null);
  }
}
