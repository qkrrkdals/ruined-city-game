// Gradient sky dome with sun, moon and stars + drifting low-poly clouds.
import * as THREE from 'three';
import { Geo } from './geo.js';
import { U } from './materials.js';

const VS = /* glsl */`
varying vec3 vDir;
void main() { vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`;
const FS = /* glsl */`
uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uSunDir; uniform vec3 uSunColor; uniform vec3 uMoonDir;
uniform float uSunVis; uniform float uMoonVis; uniform float uStars; uniform float uTime;
varying vec3 vDir;
float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
void main() {
  vec3 d = normalize(vDir);
  float h = d.y;
  vec3 col = mix(uHorizon, uTop, pow(clamp(h, 0.0, 1.0), 0.5));
  float sd = max(dot(d, uSunDir), 0.0);
  col += uSunColor * (pow(sd, 6.0) * 0.28 + pow(sd, 48.0) * 0.35) * uSunVis;
  col = mix(col, uSunColor * 1.6 + 0.4, smoothstep(0.9985, 0.9993, sd) * uSunVis);
  float md = max(dot(d, uMoonDir), 0.0);
  col += vec3(0.55, 0.62, 0.85) * pow(md, 60.0) * 0.25 * uMoonVis;
  col = mix(col, vec3(1.0, 0.98, 0.92), smoothstep(0.99955, 0.9997, md) * uMoonVis);
  if (uStars > 0.0 && h > 0.0) {
    vec3 sp = d * 220.0; vec3 cell = floor(sp); float r = hash(cell);
    float dd = length(fract(sp) - 0.5);
    float star = step(0.985, r) * smoothstep(0.22, 0.0, dd) * smoothstep(0.0, 0.25, h);
    float tw = 0.65 + 0.35 * sin(uTime * (1.5 + r * 3.0) + r * 80.0);
    col += vec3(star * tw * uStars * 1.4);
  }
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export class Sky {
  constructor(scene) {
    this.u = {
      uTop: { value: new THREE.Color('#8ec5ea') }, uHorizon: { value: new THREE.Color('#f6dcc4') },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunColor: { value: new THREE.Color('#fff0d6') },
      uMoonDir: { value: new THREE.Vector3(0, 1, 0) }, uSunVis: { value: 1 }, uMoonVis: { value: 0 }, uStars: { value: 0 }, uTime: U.uTime,
    };
    const mat = new THREE.ShaderMaterial({ uniforms: this.u, vertexShader: VS, fragmentShader: FS, side: THREE.BackSide, depthWrite: false, fog: false });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), mat);
    this.mesh.frustumCulled = false; this.mesh.renderOrder = -10;
    scene.add(this.mesh);
    // clouds
    const g = new Geo(Math.random), R = Math.random;
    this.cloudMat = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, color: '#ffffff' });
    for (let i = 0; i < 22; i++) {
      const a = R() * Math.PI * 2, r = 220 + R() * 420, cx = Math.cos(a) * r, cz = 40 + Math.sin(a) * r, cy = 150 + R() * 90, s = 14 + R() * 18;
      for (let j = 0; j < 4 + Math.floor(R() * 3); j++) g.ico(cx + (R() - 0.5) * s * 2.4, cy + (R() - 0.3) * s * 0.4, cz + (R() - 0.5) * s * 1.2, s * (0.5 + R() * 0.5), '#ffffff', { sy: 0.45, j: 0.25, shadeY: 0.35, jit: 0.04 });
    }
    this.clouds = new THREE.Mesh(g.build(), this.cloudMat);
    this.clouds.frustumCulled = false; this.clouds.renderOrder = -9;
    scene.add(this.clouds);
  }
  update(cam, dt) {
    this.mesh.position.copy(cam.position);
    this.clouds.position.x = (this.clouds.position.x + dt * 1.2) % 400;
  }
}
