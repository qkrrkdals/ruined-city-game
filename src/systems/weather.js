// Weather driven by story time and region: pollen (residential afternoon), dust wind (sunset), rain (night),
// plus wind strength for the sway shaders and a little extra fog in the rain. All particles are GPU-animated.
import * as THREE from 'three';
import { U } from '../world/materials.js';
import { dotTexture } from '../world/textures.js';

const MOTE_VS = `uniform vec3 uCam; uniform float uTime; uniform vec3 uDrift; uniform float uSize; uniform float uAmt; attribute vec4 aSeed; varying float vA;
void main() {
  float S = 34.0, H = 14.0;
  vec3 b = vec3(aSeed.x * S, aSeed.y * H, aSeed.z * S) + uDrift * uTime + vec3(sin(uTime * 0.7 + aSeed.w * 40.0) * 0.6, sin(uTime * 0.5 + aSeed.w * 20.0) * 0.4, cos(uTime * 0.6 + aSeed.w * 30.0) * 0.6);
  vec3 p = vec3(uCam.x + mod(b.x - uCam.x, S) - S * 0.5, uCam.y - 3.0 + mod(b.y - uCam.y, H), uCam.z + mod(b.z - uCam.z, S) - S * 0.5);
  vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
  vA = step(aSeed.w, uAmt) * smoothstep(0.0, 4.0, -mv.z) * (1.0 - smoothstep(10.0, 17.0, -mv.z));
  gl_PointSize = uSize * (300.0 / -mv.z);
}`;
const MOTE_FS = `uniform vec3 uColor; uniform sampler2D uMap; varying float vA;
void main() { vec4 t = texture2D(uMap, gl_PointCoord); gl_FragColor = vec4(uColor, t.a * vA * 0.8); if (gl_FragColor.a < 0.01) discard; }`;
const RAIN_VS = `uniform vec3 uCam; uniform float uTime; uniform float uAmt; uniform vec2 uWind; attribute vec3 aSeed; attribute float aEnd; varying float vA;
void main() {
  float R = 24.0, H = 16.0, sp = 15.0;
  float x = uCam.x + (fract(aSeed.x - (uCam.x - uTime * uWind.x) / (2.0 * R)) - 0.5) * 2.0 * R;
  float z = uCam.z + (fract(aSeed.y - (uCam.z - uTime * uWind.y) / (2.0 * R)) - 0.5) * 2.0 * R;
  float y = uCam.y - 4.0 + fract(aSeed.z - uTime * sp / H) * H;
  vec3 p = vec3(x, y, z) + aEnd * vec3(-uWind.x * 0.05, 0.75, -uWind.y * 0.05);
  vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
  vA = step(fract(aSeed.x * 91.7 + aSeed.y * 13.3), uAmt) * (0.25 + aEnd * 0.3);
}`;
const RAIN_FS = `uniform vec3 uColor; varying float vA; void main() { if (vA < 0.01) discard; gl_FragColor = vec4(uColor, vA); }`;

function motes(n, color, size, drift) {
  const seed = new Float32Array(n * 4); for (let i = 0; i < n * 4; i++) seed[i] = Math.random();
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
  const m = new THREE.ShaderMaterial({ uniforms: { uCam: { value: new THREE.Vector3() }, uTime: U.uTime, uDrift: { value: new THREE.Vector3(...drift) }, uSize: { value: size }, uAmt: { value: 0 }, uColor: { value: new THREE.Color(color) }, uMap: { value: dotTexture() } }, vertexShader: MOTE_VS, fragmentShader: MOTE_FS, transparent: true, depthWrite: false });
  const p = new THREE.Points(g, m); p.frustumCulled = false; return p;
}

export class Weather {
  constructor(G) {
    this.G = G; this.wind = 0.8; this.rain = 0; this.dust = 0; this.pollen = 0;
    this.pollenPts = motes(260, '#fff6dc', 0.09, [0.35, 0.05, -0.2]);
    this.dustPts = motes(700, '#f6cfa6', 0.11, [-4.5, 0.2, 1.2]);
    const n = 2000, seed = new Float32Array(n * 2 * 3), end = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) { const s = [Math.random(), Math.random(), Math.random()]; seed.set(s, i * 6); seed.set(s, i * 6 + 3); end[i * 2] = 0; end[i * 2 + 1] = 1; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 6), 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 3)); g.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
    this.rainMat = new THREE.ShaderMaterial({ uniforms: { uCam: { value: new THREE.Vector3() }, uTime: U.uTime, uAmt: { value: 0 }, uWind: { value: new THREE.Vector2(-1.5, 0.6) }, uColor: { value: new THREE.Color('#c9d3ec') } }, vertexShader: RAIN_VS, fragmentShader: RAIN_FS, transparent: true, depthWrite: false });
    this.rainLines = new THREE.LineSegments(g, this.rainMat); this.rainLines.frustumCulled = false;
    G.scene.add(this.pollenPts, this.dustPts, this.rainLines);
    this.rainScale = 0.6;
    G.events.on('quality', (q) => { this.rainScale = q.rain / 2000; });
  }
  update(dt) {
    const G = this.G, h = G.time.hour, cam = G.camera.position, zone = G.world.zoneAt(cam), outside = !zone || zone.kind === 'outdoor';
    const reg = G.state === 'title' ? 'r1' : G.world.regionAt(G.state === 'playing' ? G.player.feet : cam);
    const ending = G.state === 'cutscene';
    const tPollen = reg === 'r1' && h < 17.2 ? 1 : 0;
    const tDust = !ending && h > 16.8 && h < 19.4 && reg !== 'r3' ? Math.min(1, (h - 16.8) * 2, (19.4 - h) * 2) : 0;
    const tRain = !ending && h > 19.25 && h < 23.5 ? Math.min(1, (h - 19.25) * 3) : 0;
    const k = Math.min(1, dt * 0.35);
    this.pollen += (tPollen - this.pollen) * k; this.dust += (tDust - this.dust) * k; this.rain += (tRain - this.rain) * k;
    this.wind = (reg === 'r3' ? 0.55 : 0.8) + this.dust * 1.4 + this.rain * 0.6;
    U.uWind.value += (this.wind - U.uWind.value) * Math.min(1, dt);
    U.uFogDensity.value *= 1 + this.rain * 0.12 + this.dust * 0.08;
    for (const m of [this.pollenPts, this.dustPts]) m.material.uniforms.uCam.value.copy(cam);
    this.pollenPts.material.uniforms.uAmt.value = outside ? this.pollen * 0.9 : 0;
    this.dustPts.material.uniforms.uAmt.value = outside ? this.dust : 0;
    this.rainMat.uniforms.uCam.value.copy(cam);
    this.rainMat.uniforms.uAmt.value = outside ? this.rain * this.rainScale : 0;
    this.pollenPts.visible = this.pollen > 0.01 && outside; this.dustPts.visible = this.dust > 0.01 && outside; this.rainLines.visible = this.rain > 0.01 && outside;
    G.gfx.bloom.strength = 0.42 + G.time.night * 0.45;
  }
}
