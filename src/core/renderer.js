// Renderer, camera, post-processing (bloom) and graphics quality presets.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { CFG } from './config.js';

export const QUALITY = {
  low: { pr: 0.75, shadows: false, sunMap: 512, flashShadow: false, flashMap: 256, bloom: false, density: 0.45, rain: 600, msaa: 0 },
  medium: { pr: 1, shadows: true, sunMap: 1024, flashShadow: true, flashMap: 512, bloom: true, density: 0.75, rain: 1200, msaa: 2 },
  high: { pr: 1.5, shadows: true, sunMap: 2048, flashShadow: true, flashMap: 1024, bloom: true, density: 1, rain: 2000, msaa: 4 },
};

export function createRenderer(canvas, G) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', stencil: false });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(CFG.fov, innerWidth / innerHeight, 0.1, 1500);
  camera.rotation.order = 'YXZ';
  scene.add(camera);
  const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.55, 0.5, 0.92);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  const gfx = {
    renderer, scene, camera, composer, bloom, q: QUALITY.medium, qName: 'medium',
    resize() {
      const w = innerWidth, h = innerHeight, dpr = Math.min(devicePixelRatio || 1, 2);
      const pr = this.qName === 'high' ? Math.min(dpr, 1.5) : this.qName === 'medium' ? Math.min(dpr, 1) : Math.min(dpr, 1) * 0.75;
      renderer.setPixelRatio(pr); renderer.setSize(w, h, false);
      composer.setPixelRatio(pr); composer.setSize(w, h);
      bloom.setSize(Math.round(w * pr * 0.5), Math.round(h * pr * 0.5));
      camera.aspect = w / h; camera.updateProjectionMatrix();
    },
    setQuality(name) {
      this.qName = QUALITY[name] ? name : 'medium'; this.q = QUALITY[this.qName];
      renderer.shadowMap.enabled = this.q.shadows;
      for (const t of [composer.renderTarget1, composer.renderTarget2]) if (t.samples !== this.q.msaa) { t.samples = this.q.msaa; t.dispose(); }
      G.events.emit('quality', this.q, this.qName);
      scene.traverse((o) => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { m.needsUpdate = true; }); });
      this.resize();
    },
    render() { if (this.q.bloom) composer.render(); else renderer.render(scene, camera); },
  };
  addEventListener('resize', () => gfx.resize());
  return gfx;
}
