// 붓 획 이펙트: 휘두른 자리에 먹 획이 그어졌다가 마르며 사라진다. 호(arc)·직선(line)·고리(ring).
import * as THREE from 'three';
import { G } from '../core/g.js';
import { brushTexture } from './textures.js';
import { HEX } from './palette.js';

const VERT = /* glsl */`
attribute float aT; attribute float aV;
uniform float uA0; uniform float uA1; uniform float uR0; uniform float uR1; uniform float uLine; uniform float uLen; uniform float uWidth;
uniform vec3 uC; uniform vec3 uE1; uniform vec3 uE2;
varying vec2 vUv;
void main() {
  vec3 p;
  if (uLine > 0.5) p = uC + uE1 * (aT * uLen) + uE2 * ((aV - 0.5) * uWidth);
  else { float a = mix(uA0, uA1, aT); p = uC + (cos(a) * uE1 + sin(a) * uE2) * mix(uR0, uR1, aV); }
  vUv = vec2(aT, aV);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;
const FRAG = /* glsl */`
uniform sampler2D uTex; uniform float uProg; uniform float uFade; uniform float uDry; uniform vec3 uColor; uniform float uOpacity; uniform float uFlat;
varying vec2 vUv;
void main() {
  float u = vUv.x, v = vUv.y;
  float rev = 1.0 - smoothstep(uProg - 0.03, uProg + 0.01, u);
  float tail = smoothstep(uFade * 1.3 - 0.3, uFade * 1.3, u);
  float prof = mix(smoothstep(0.0, 0.07, u) * (1.0 - 0.78 * smoothstep(0.4, 1.0, u)), 1.0, uFlat);
  float w = abs(v - 0.56) / (0.44 * prof + 0.001);
  float body = 1.0 - smoothstep(0.72, 1.0, w);
  float hair = texture2D(uTex, vec2(u * 0.92 + 0.04, clamp((v - 0.56) / (prof + 0.001) * 0.5 + 0.5, 0.0, 1.0))).a;
  float a = body * rev * tail * mix(1.0, hair, uDry) * uOpacity * (1.0 - uFade * 0.5);
  if (a < 0.012) discard;
  gl_FragColor = vec4(uColor, a);
}`;

export const Slash = {};
export function createSlash() {
  const N = 30, aT = [], aV = [], idx = [], pos = [];
  for (let i = 0; i <= N; i++) { aT.push(i / N, i / N); aV.push(0, 1); pos.push(0, 0, 0, 0, 0, 0); if (i < N) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('aT', new THREE.Float32BufferAttribute(aT, 1));
  geo.setAttribute('aV', new THREE.Float32BufferAttribute(aV, 1));
  geo.setIndex(idx);
  const texs = [brushTexture(3), brushTexture(11)];
  const pool = [], scene = G.gfx.scene;
  function make() {
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      uniforms: {
        uA0: { value: 0 }, uA1: { value: 1 }, uR0: { value: 1 }, uR1: { value: 2 }, uLine: { value: 0 }, uLen: { value: 1 }, uWidth: { value: 1 },
        uC: { value: new THREE.Vector3() }, uE1: { value: new THREE.Vector3(0, 0, 1) }, uE2: { value: new THREE.Vector3(-1, 0, 0) },
        uTex: { value: texs[0] }, uProg: { value: 0 }, uFade: { value: 0 }, uDry: { value: 0.7 }, uColor: { value: new THREE.Color(HEX.ink) }, uOpacity: { value: 1 }, uFlat: { value: 0 },
      },
    });
    const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; mesh.renderOrder = 4; mesh.visible = false;
    return { mesh, u: mat.uniforms, on: false, t: 0 };
  }
  function get() {
    let s = pool.find((x) => !x.on);
    if (!s) { if (pool.length < 40) { s = make(); pool.push(s); } else { s = pool[0]; for (const x of pool) if (x.t > s.t) s = x; } }
    if (s.mesh.parent) s.mesh.parent.remove(s.mesh);
    s.on = true; s.t = 0; s.mesh.visible = true; s.mesh.position.set(0, 0, 0); s.mesh.rotation.set(0, 0, 0); s.mesh.scale.set(1, 1, 1);
    s.grow = 0; s.vel = null; s.onEnd = null; s.hold = 0;
    s.u.uTex.value = texs[(Math.random() * 2) | 0]; s.u.uFlat.value = 0; s.u.uLine.value = 0; s.u.uOpacity.value = 1;
    return s;
  }
  function common(s, o) {
    s.reveal = o.reveal ?? 0.1; s.fade = o.fade ?? 0.28; s.hold = o.hold ?? 0;
    s.u.uColor.value.set(o.color ?? HEX.ink); s.u.uDry.value = o.dry ?? 0.7; s.u.uOpacity.value = o.opacity ?? 1; s.u.uFlat.value = o.flat ?? 0;
    s.u.uProg.value = s.reveal <= 0 ? 1.05 : 0; s.u.uFade.value = 0;
    (o.parent || scene).add(s.mesh);
    if (o.pos) s.mesh.position.copy(o.pos);
    if (o.yaw !== undefined) s.mesh.rotation.y = o.yaw;
    return s;
  }
  Object.assign(Slash, {
    // 호: 평면 e1=앞(0,0,1), e2=(-cos tilt, sin tilt, 0). parent 의 지역 좌표.
    arc(o) {
      const s = get(), u = s.u, t = o.tilt || 0;
      u.uA0.value = o.a0; u.uA1.value = o.a1; u.uR0.value = o.r0; u.uR1.value = o.r1;
      u.uC.value.set(...(o.c || [0, 1.2, 0])); u.uE1.value.set(0, 0, 1); u.uE2.value.set(-Math.cos(t), Math.sin(t), 0);
      return common(s, o);
    },
    // 직선(찌르기·돌진): c 에서 dir 방향으로 len
    line(o) {
      const s = get(), u = s.u;
      u.uLine.value = 1; u.uLen.value = o.len; u.uWidth.value = o.width || 0.5;
      u.uC.value.set(...(o.c || [0, 1.1, 0])); u.uE1.value.set(...(o.dir || [0, 0, 1])); u.uE2.value.set(...(o.side || [0, 1, 0]));
      return common(s, o);
    },
    // 땅에 퍼지는 고리(충격파·예고). pos=세계 좌표
    ring(o) {
      const s = get(), u = s.u;
      u.uA0.value = 0; u.uA1.value = Math.PI * 2; u.uR0.value = o.r0; u.uR1.value = o.r1; u.uC.value.set(0, o.y ?? 0.12, 0);
      u.uE1.value.set(0, 0, 1); u.uE2.value.set(1, 0, 0);
      common(s, { reveal: 0, fade: o.fade ?? 0.4, flat: 1, dry: o.dry ?? 0.5, ...o });
      s.grow = o.grow || 0; s.width = o.r1 - o.r0;
      return s;
    },
    kill(s) { if (s && s.on) { s.on = false; s.mesh.visible = false; if (s.mesh.parent) s.mesh.parent.remove(s.mesh); } },
    update(dt) {
      for (const s of pool) {
        if (!s.on) continue;
        s.t += dt;
        const u = s.u;
        if (s.reveal > 0) u.uProg.value = Math.min(1.05, (s.t / s.reveal) * 1.05);
        if (s.grow) { u.uR0.value += s.grow * dt; u.uR1.value = u.uR0.value + s.width; }
        if (s.vel) s.mesh.position.addScaledVector(s.vel, dt);
        const ft = s.t - s.reveal - s.hold;
        if (ft > 0) { u.uFade.value = Math.min(1, ft / s.fade); if (ft >= s.fade) { const cb = s.onEnd; Slash.kill(s); if (cb) cb(); } }
      }
    },
  });
  return Slash;
}
