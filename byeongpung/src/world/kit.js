// 소품 배치 도구: 움직이지 않는 소품은 재질·구역(타일)별로 한 메시에 합친다. 글씨 판, 먹 장막도 여기서.
import * as THREE from 'three';
import { G } from '../core/g.js';
import { F } from './field.js';
import { MAT, patch } from '../gfx/materials.js';
import { merge } from '../gfx/geo.js';
import { canvas, canvasTexture } from '../gfx/textures.js';

const TILE = 96, _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1);

export class Kit {
  constructor(scene) { this.scene = scene; this.buckets = new Map(); }
  // parts: [[지오메트리, 재질 이름], ...] (지역 좌표) → 세계 좌표로 옮겨 쌓는다. y 를 주지 않으면 땅 높이.
  place(parts, x, z, ry = 0, y, scale = 1) {
    const py = y === undefined ? F.hr(x, z) : y;
    _m.compose(_p.set(x, py, z), _q.setFromEuler(_e.set(0, ry, 0)), _s.set(scale, scale, scale));
    for (const [geo, mat] of parts) {
      geo.applyMatrix4(_m);
      const key = `${mat || 'world'}:${Math.floor(x / TILE)}:${Math.floor(z / TILE)}`;
      let b = this.buckets.get(key); if (!b) this.buckets.set(key, (b = { mat: mat || 'world', list: [] })); b.list.push(geo);
    }
  }
  build() {
    const group = new THREE.Group(); group.name = 'props';
    for (const b of this.buckets.values()) { const m = new THREE.Mesh(merge(b.list), MAT[b.mat]); m.matrixAutoUpdate = false; group.add(m); }
    this.scene.add(group); this.buckets.clear();
    return group;
  }
}

// 붓글씨 판(간판·장승 글씨). vertical=세로쓰기
export function textPlane(text, o = {}) {
  const chars = [...text], fs = o.px || 96, pad = fs * 0.2, v = !!o.vertical;
  const W = v ? fs + pad * 2 : fs * chars.length * 0.95 + pad * 2, H = v ? fs * chars.length * 1.02 + pad * 2 : fs + pad * 2;
  const cv = canvas(Math.ceil(W), Math.ceil(H)), g = cv.getContext('2d');
  if (o.bg) { g.fillStyle = o.bg; g.fillRect(0, 0, W, H); }
  g.fillStyle = o.color || '#15151b'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `${fs}px ${o.font || '"BP Brush", "BP Title", serif'}`;
  chars.forEach((ch, i) => (v ? g.fillText(ch, W / 2, pad + fs * (i + 0.5) * 1.02) : g.fillText(ch, pad + fs * (i + 0.5) * 0.95, H / 2)));
  const tex = canvasTexture(cv, { clamp: true });
  const h = o.h || 1, w = (h * W) / H;
  const mat = o.keep ? new THREE.MeshBasicMaterial({ map: tex, transparent: true, fog: true }) : patch(new THREE.MeshLambertMaterial({ map: tex, transparent: true, alphaTest: 0.3 }));
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.userData.w = w;
  return mesh;
}

// 먹 장막: 길을 막는 흐르는 먹. set(true/false) 로 켜고 끈다(충돌 포함).
const BAR_V = `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const BAR_F = `uniform float uTime; uniform float uOn; varying vec2 vUv;
float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
void main() {
  float f = n(vec2(vUv.x * 9.0, vUv.y * 2.2 + uTime * 0.7)) * 0.6 + n(vec2(vUv.x * 21.0, vUv.y * 5.0 + uTime * 1.3)) * 0.4;
  float a = smoothstep(0.22, 0.6, f + (1.0 - vUv.y) * 0.55) * uOn;
  a *= smoothstep(0.0, 0.06, vUv.x) * smoothstep(1.0, 0.94, vUv.x) * (1.0 - smoothstep(0.72, 1.0, vUv.y + (1.0 - uOn)));
  if (a < 0.02) discard;
  gl_FragColor = vec4(mix(vec3(0.05, 0.05, 0.07), vec3(0.3, 0.05, 0.03), smoothstep(0.75, 1.0, f) * 0.5), a * 0.95);
}`;
export function makeBarrier(x1, z1, x2, z2, h = 5) {
  const len = Math.hypot(x2 - x1, z2 - z1), mx = (x1 + x2) / 2, mz = (z1 + z2) / 2;
  const mat = new THREE.ShaderMaterial({ vertexShader: BAR_V, fragmentShader: BAR_F, transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: { uTime: { value: 0 }, uOn: { value: 0 } } });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(len, h), mat);
  mesh.position.set(mx, F.h(mx, mz) + h / 2 - 0.2, mz); mesh.rotation.y = Math.atan2(-(z2 - z1), x2 - x1); mesh.renderOrder = 3; mesh.visible = false;
  G.gfx.scene.add(mesh);
  const col = F.addSeg(x1, z1, x2, z2, 0.7); col.on = false;
  const B = {
    mesh, col, on: false, target: 0, cx: mx, cz: mz,
    set(v, silent) { this.on = v; this.target = v ? 1 : 0; col.on = v; if (v) mesh.visible = true; if (!silent) G.audio.play('barrier'); },
    update(rdt) { const u = mat.uniforms; u.uTime.value += rdt; u.uOn.value += (this.target - u.uOn.value) * Math.min(1, rdt * 3); if (!this.on && u.uOn.value < 0.02) mesh.visible = false; },
  };
  G.world.updaters.push((dt, rdt) => B.update(rdt));
  return B;
}
